var background = chrome.extension.getBackgroundPage(),
	app = background.app,
	TagAutocomplete = /** @class */ (function () {
		function TagAutocomplete(options) {
			this.KEY_BACKSPACE = 8;
			this.KEY_ENTER = 13;
			this.KEY_UP = 38;
			this.KEY_DOWN = 40;
			this.defaults = {
				name: '',
				selector: '',
				placeHolder: 'Enter some text',
				noMatchesText: null,
				initialTags: null,
				initialSuggestions: null,
				suggestionRenderer: TagAutocomplete.Autocomplete.defaultRenderer,
				minCharactersForSuggestion: 1,
				onChange: null,
				suggestionCallback: null
			};
	
			this.options = Object.assign(Object.assign({}, this.defaults), options)
			this.onChange = isFunction(this.options.onChange) ? this.options.onChange : null
			this.suggestionCallback = isFunction(this.options.suggestionCallback) ? this.options.suggestionCallback : null
	
			var passedContainer = document.querySelector(this.options.selector);
			if (!passedContainer) {
				throw new Error('passed selector does not point to a DOM element.');
			}
			this.container = passedContainer;
			this.container.classList.add('tags-autocomplete-container');
			if (!Array.isArray(this.options.initialTags) && !Array.isArray(this.options.initialSuggestions)) {
				this.parseTagsAndSuggestions();
			}
			this.hiddenSelect = document.createElement('select');
			this.textInput = document.createElement('span');
	
			this.hiddenSelect.id = this.container.id + '-select';
			this.hiddenSelect.name = this.options.name;
			this.hiddenSelect.setAttribute('multiple', 'true');
			this.hiddenSelect.style.display = 'none';
			this.textInput.id = this.container.id + '-input';
			this.textInput.classList.add('tags-autocomplete-input');
			this.textInput.setAttribute('data-placeholder', this.options.placeHolder);
			this.textInput.contentEditable = 'true';
	
			this.container.appendChild(this.textInput);
			this.container.appendChild(this.hiddenSelect);
	
			this.select = new TagAutocomplete.MultiSelect(this);
			this.autocomplete = new TagAutocomplete.Autocomplete(this);
	
			var me = this;
	
			if (Array.isArray(this.options.initialTags)) {
				this.options.initialTags.forEach(function (token) {
					if (typeof token === 'object') {
						me.select.addTag(token.value, token.text);
					}
				});
			}
			this.textInput.addEventListener('keydown', function (event) {
				if (event.which == me.KEY_ENTER || event.keyCode == me.KEY_ENTER) {
					event.preventDefault();
					var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.tags-autocomplete-suggestion-highlighted');
					if (highlightedSuggestion !== null) {
						var value = highlightedSuggestion.getAttribute('data-value')
						!me.select.hasValue(value) && me.select.addTag(value, value)
					}
					else {
						!me.select.hasValue(me.textInput.textContent) && me.select.addTag(me.textInput.textContent, me.textInput.textContent);
					}
					me.clearCurrentInput();
				}
				else if (me.textInput.textContent === '' && (event.which == me.KEY_BACKSPACE || event.keyCode == me.KEY_BACKSPACE)) {
					event.preventDefault();
					me.select.removeLastToken();
				}
			});
			this.textInput.addEventListener('keyup', function (event) {
				var _a, _b;
				if ((event.which == me.KEY_UP || event.keyCode == me.KEY_UP) && me.autocomplete.suggestions.childNodes.length > 0) {
					var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.tags-autocomplete-suggestion-highlighted');
					var aboveSuggestion = (_a = highlightedSuggestion) === null || _a === void 0 ? void 0 : _a.previousSibling;
					if (aboveSuggestion != null) {
						me.autocomplete.highlightSuggestion(aboveSuggestion);
					}
					return;
				}
				if ((event.which == me.KEY_DOWN || event.keyCode == me.KEY_DOWN) && me.autocomplete.suggestions.childNodes.length > 0) {
					var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.tags-autocomplete-suggestion-highlighted');
					var belowSuggestion = (_b = highlightedSuggestion) === null || _b === void 0 ? void 0 : _b.nextSibling;
					if (belowSuggestion != null) {
						me.autocomplete.highlightSuggestion(belowSuggestion);
					}
					return;
				}
				me.autocomplete.hideSuggestions();
				me.autocomplete.clearSuggestions();
				var value = me.textInput.textContent || '';
				if (value.length >= me.options.minCharactersForSuggestion) {
					if (Array.isArray(me.options.initialSuggestions)) {
						me.options.initialSuggestions.forEach(function (suggestion) {
							if (typeof suggestion !== 'object') {
								// the suggestion is of wrong type and therefore ignored
								return;
							}
							if (value.localeCompare(suggestion.text.slice(0, value.length), undefined, { sensitivity: 'base' }) === 0) {
								// The suggestion starts with the query text the user entered and will be displayed
								me.autocomplete.addSuggestion(suggestion);
							}
						});
						if (me.autocomplete.suggestions.childNodes.length > 0) {
							me.autocomplete.highlightSuggestionAtPosition(0);
						}
						else if (me.options.noMatchesText) {
							me.autocomplete.addSuggestion({ value: '_no_match_', text: me.options.noMatchesText, description: null });
						}
					}
					else if (me.suggestionCallback) {
						var suggestions = me.suggestionCallback(value)
						if (Array.isArray(suggestions)) {
							suggestions.forEach(function (suggestion) {
								me.autocomplete.addSuggestion(suggestion);
							});
							if (me.autocomplete.suggestions.childNodes.length > 0) {
								me.autocomplete.highlightSuggestionAtPosition(0);
							}
							else if (me.options.noMatchesText) {
								me.autocomplete.addSuggestion({ value: '_no_match_', text: me.options.noMatchesText, description: null });
							}
						}
					}
				}
			});
			Object.defineProperty(this, "val", {
				get() {
					return Array.from(this.select._value).map(tag=>tag.value).join(",");
				},
				set(value) {
					if(value)this.reCreate(value);
				}
			});
			this.container.tagAutocomplete = this;
		}
		/**
		* Searches the element given as a container for option elements and creates active tags (when the option is marked selected)
		* and suggestions (all options found) from these. During this all found options are removed from the DOM.
		*/
		TagAutocomplete.prototype.parseTagsAndSuggestions = function () {
			var initialTags = [];
			var initialSuggestions = [];
			var options = this.container.querySelectorAll('option');
			var me = this;
			options.forEach(function (option) {
				if (option.text != null) {
					if (option.hasAttribute('selected')) {
						initialTags.push({ value: option.value, text: option.text });
					}
					initialSuggestions.push({ value: option.value, text: option.text, description: null });
				}
				me.container.removeChild(option);
			});
			if (initialTags.length > 0) {
				this.options.initialTags = initialTags;
			}
			if (initialSuggestions.length > 0) {
				this.options.initialSuggestions = initialSuggestions;
			}
		};
		/**
		* Clears the currently present tags and creates new ones from the given input value.
		*/
		TagAutocomplete.prototype.reCreate = function (value) {
			this.select.clear();
			var me = this;
			if (Array.isArray(value)) {
				value = Array.from(value);
				value.forEach(function (tag) {
					if (typeof tag === 'object') {
						!me.select.hasValue(tag.value) && me.select.addTag(tag.value, tag.text);
					}
					else if (typeof tag === 'string'){
						tag.split(',').forEach((tag_)=>{if(tag_.length)!me.select.hasValue(tag_) && me.select.addTag(tag_,tag_.toUpperCase());})
					}
				});
			}
			else if (typeof value === 'object') {
				!this.select.hasValue(value.value) && me.select.addTag(value.value, value.text);
			} else if (typeof value === 'string') {
				value.split(',').forEach((tag)=>{if(tag.length)!me.select.hasValue(tag) && me.select.addTag(tag,tag.toUpperCase());})
			}
		};
		TagAutocomplete.prototype.clearCurrentInput = function () {
			this.textInput.textContent = '';
		};
		var _a;
		TagAutocomplete.MultiSelect = /** @class */ (function () {
			function MultiSelect(parent) {
				this.parent = parent;
				this.container = parent.container;
				this.options = parent.options;
				this._value = []
				this._index = 0
			}
			/**
			* Adds a tag with the specified name to the list of currently prensent tags displayed to the user and the hidden select.
			*
			* @param {string} tagText - the name of the tag to create
			*/
			MultiSelect.prototype.addTag = function (tagValue, tagText) {
				if (tagValue === null || tagText === null) {
					return;
				}
				var option = document.createElement('option');
				option.text = tagText;
				option.value = tagValue;
				option.setAttribute('selected', 'true');
				option.setAttribute('data-text', tagText);
				option.setAttribute('data-value', tagValue);
				this.parent.hiddenSelect.add(option);
				var token = document.createElement('span');
				token.classList.add('tags-autocomplete-tags');
				token.setAttribute('data-text', tagText);
				token.setAttribute('data-tag-key', this._index)
				option.setAttribute('data-value', tagValue);
				token.textContent = tagText;
				token.setAttribute('data-tag-key', this._index)
				var deleteToken = document.createElement('span');
				deleteToken.classList.add('tags-autocomplete-tags-delete');
				deleteToken.textContent = '\u00D7';
				token.appendChild(deleteToken);
				var me = this;
				deleteToken.addEventListener('click', function (event) {
					me.removeTag(token);
				});
				this.container.insertBefore(token, this.parent.textInput);
	
				var oldValue = Array.from(this._value);
				this._value.push({ text: tagText, value: tagValue, _key: this._index });
				this._index += 1
				var newValue = Array.from(this._value);
				this.emitChange(newValue, oldValue)
	
			};
			/**
			* 
			* 
			*/
			MultiSelect.prototype.hasValue = function (text) {
				return (this._value.find(entry => entry.value === text) !== undefined)
			}
			/**
			* Completely clears the currently present tags from the field.
			*/
			MultiSelect.prototype.clear = function () {
				var tags = this.container.querySelectorAll('.tags-autocomplete-tags');
				var me = this;
				tags.forEach(function (token) { me.removeTag(token); });
			};
			/**
			* Removes the last tag in the list of currently present tag. This is the last added tag next to the input field.
			*/
			MultiSelect.prototype.removeLastToken = function () {
				var tags = this.container.querySelectorAll('.tags-autocomplete-tags');
				var token = tags[tags.length - 1];
				this.removeTag(token);
			};
			/**
			* Removes the specified tag from the list of currently present tags.
			*
			* @param {Element} tag - the tag to remove
			*/
			MultiSelect.prototype.removeTag = function (tag) {
				var _a, _b;
				this.container.removeChild(tag);
				var tagText = tag.getAttribute('data-text');
				var key = tag.getAttribute('data-tag-key');
				var hiddenOption = this.parent.hiddenSelect.querySelector('option[data-text="' + tagText + '"]');
	
				(_b = (_a = hiddenOption) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(hiddenOption);
				var oldValue = Array.from(this._value)
	
				this._value = this._value.filter(function (entry, index) {
					return entry._key !== parseInt(key)
				})
				var newValue = Array.from(this._value)
				this.emitChange(newValue, oldValue)
			};
	
			MultiSelect.prototype.removeTagWithText = function (tokenText) {
				if (tokenText === null) {
					return;
				}
				var token = this.container.querySelector('.tags-autocomplete-tags[data-text="' + tokenText + '"]');
				if (token !== null) {
					this.removeTag(token);
				}
			};
			MultiSelect.prototype.emitChange = function (newValue, oldValue) {
				this.parent.onChange && this.parent.onChange(newValue, oldValue)
			}
			return MultiSelect;
		}());
		TagAutocomplete.Autocomplete = (_a = /** @class */ (function () {
			function Autocomplete(parent) {
				this.parent = parent;
				this.container = parent.container;
				this.options = parent.options;
				this.renderer = parent.options.suggestionRenderer;
				this.suggestions = document.createElement('ul');
				this.suggestions.id = this.container.id + '-suggestions';
				this.suggestions.classList.add('tags-autocomplete-suggestions');
				this.container.appendChild(this.suggestions);
			}
			/**
			* Hides the suggestions dropdown from the user.
			*/
			Autocomplete.prototype.hideSuggestions = function () {
				this.suggestions.style.display = '';
			};
			/**
			* Shows the suggestions dropdown to the user.
			*/
			Autocomplete.prototype.showSuggestions = function () {
				this.suggestions.style.display = 'block';
			};
	
			Autocomplete.prototype.highlightSuggestionAtPosition = function (index) {
				var suggestions = this.suggestions.querySelectorAll('li');
				suggestions.forEach(function (suggestion) {
					suggestion.classList.remove('tags-autocomplete-suggestion-highlighted');
				});
				suggestions[index].classList.add('tags-autocomplete-suggestion-highlighted');
			};
			Autocomplete.prototype.highlightSuggestion = function (suggestion) {
				this.suggestions.querySelectorAll('li').forEach(function (suggestion) {
					suggestion.classList.remove('tags-autocomplete-suggestion-highlighted');
				});
				suggestion.classList.add('tags-autocomplete-suggestion-highlighted');
			};
			/**
			* Removes all previous suggestions from the dropdown.
			*/
			Autocomplete.prototype.clearSuggestions = function () {
				this.suggestions.innerHTML = '';
			};
			/**
			* Adds a suggestion with the given text matching the users input to the dropdown.
			*
			* @param {string} suggestionText - the text that should be displayed for the added suggestion
			*/
			Autocomplete.prototype.addSuggestion = function (suggestion) {
				if(this.parent.select.hasValue(suggestion.value))return true;
				var element = this.renderer(suggestion),
					me = this;
				element.setAttribute('data-value', suggestion.value);
				element.addEventListener('click', function (_event) {
					if (suggestion.text == me.options.noMatchesText) {
						return true;
					}
					!me.parent.select.hasValue(suggestion.value) && me.parent.select.addTag(suggestion.value, suggestion.text);
					me.clearSuggestions();
					me.hideSuggestions();
					me.parent.clearCurrentInput();
				});
				if (this.container.querySelector('.tags-autocomplete-tags[data-text="' + suggestion.text + '"]') !== null) {
					element.classList.add('tags-autocomplete-suggestion-active');
				}
				this.suggestions.appendChild(element);
				this.showSuggestions();
			};
			return Autocomplete;
		}()),
			_a.defaultRenderer = function (suggestion) {
				var option = document.createElement('li');
				option.textContent = suggestion.text;
				if (suggestion.description) {
					var description = document.createElement('small');
					description.textContent = suggestion.description;
					description.classList.add('tags-autocomplete-suggestion-description');
					option.appendChild(description);
				}
				return option;
			},
			_a);
		return TagAutocomplete;
	}());
$(function () {
	$(".placeholder").click(function (e) {
		if (!$(e.target).hasClass('placeholder-input'))
			$(this).find('.placeholder-input').focus();

	});
	$(".placeholder .placeholder-input")
		.on('click.placeholderInput focus.placeholderInput', function () {
			$(this)
				.closest('.placeholder')
				.addClass('placeholder-focus')
				.trigger('placeholder-focus')
				.trigger('change');
		})
		.on('blur.placeholderInput', function () {
			$(this)
				.closest('.placeholder')
				.removeClass('placeholder-focus')
				.trigger('placeholder-blur')
				.trigger('change');
		});
	$(".placeholder")
		.on('change.placeholderInput', function () {
			if ($(this).find('.placeholder-input').val() != "") {
				$(this).addClass('has-data');
			} else {
				$(this).removeClass('has-data');
			}
		})
		.on('update.placeholderInput', function () {
			var $this = $(this);
			$.delay(1, function () {
				$this.find(".placeholder-input").trigger('click blur change');
				$this.trigger('change');
			});
		});
	$.plugin('stackUpdate', function () {
		var $this = this,
			strEvents = 'keyup.stackUpdate click.stackUpdate blur.stackUpdate change.stackUpdate',
			refUpdateDelay,
			strCurrentValue = $this.val();
		if ($this.hasClass('stackUpdate'))return $this;
		$this.addClass('stackUpdate')
			.bind(strEvents, function () {
				var strName = $this.attr('name'),
					strVal = $this.val();
				if (strName == 'value' && !strVal.match(/^https?:\/\//i)) {
					// validate url
					$this.addClass('error');
					return;
				} else if (strVal == '') {
					$this.addClass('error');
					return;
				} else {
					$this.removeClass('error');
				}
				window.clearTimeout(refUpdateDelay);
				refUpdateDelay = $.delay(1000, (function (that) {
					return function () {
						updateCall(that);
					};
				})($this[0]));
			});
		function updateCall(that) {
			var $this = $(that);
			if ($this.hasClass('error'))return;
			var strVal = $this.val();
			if (strVal == strCurrentValue)return;
			// make sure it still exists
			strCurrentValue = strVal;
			var strName = $this.attr('name');
			if (!strName || !strName.length) {
				return alert('Error missing name parameter for update call');
			}
			app.modifyBookmark(strName , strVal)
		}
		return $this;
	});
})
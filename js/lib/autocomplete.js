var InputAutocomplete = /** @class */ (function () {
    function InputAutocomplete(options) {
        this.KEY_BACKSPACE = 8;
        this.KEY_ENTER = 13;
        this.KEY_UP = 38;
        this.KEY_DOWN = 40;
        var _defaults = {
            name: '',
            selector: '',
            noMatchesText: null,
            suggestionRenderer: InputAutocomplete.Autocomplete.defaultRenderer,
            minCharactersForSuggestion: 1,
            onSelect: null,
            suggestionCallback: null
        };
        this.options = Object.assign(Object.assign({}, _defaults), options)
        this.onSelect = isFunction(this.options.onSelect) ? this.options.onSelect : null
        this.suggestionCallback = isFunction(this.options.suggestionCallback) ? this.options.suggestionCallback : null

        var passedEl = document.querySelector(this.options.selector);
        if (!passedEl) throw new Error('passed selector does not point to a DOM element.');
        this.container = passedEl;
        this.textInput = this.container.querySelector('input')
        this.container.classList.add('autocomplete-container');

        this.autocomplete = new InputAutocomplete.Autocomplete(this);
        var me = this;
        this.textInput.addEventListener('keydown', function (event) {
            if (event.which == me.KEY_UP || event.keyCode == me.KEY_UP || event.which == me.KEY_DOWN || event.keyCode == me.KEY_DOWN) {
                event.preventDefault();
            }
        });
        this.textInput.addEventListener('keyup', function (event) {
            var _a, _b;

            if (event.which == me.KEY_ENTER || event.keyCode == me.KEY_ENTER) {
                var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.token-autocomplete-suggestion-highlighted');
                if (highlightedSuggestion !== null) {
                    event.preventDefault();
                    var value = highlightedSuggestion.suggestion || highlightedSuggestion.getAttribute('data-value')
                    me.onSelect && me.onSelect(value)
                    me.autocomplete.clearSuggestions();
                    me.autocomplete.hideSuggestions();
                }

            }
            else if (
                (event.which == me.KEY_UP || event.keyCode == me.KEY_UP) &&
                me.autocomplete.suggestions.childNodes.length > 1
            ) {
                var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.token-autocomplete-suggestion-highlighted');
                var aboveSuggestion = (_a = highlightedSuggestion) === null || _a === void 0 ? void 0 : _a.previousSibling;
                if (aboveSuggestion !== null) {
                    me.autocomplete.highlightSuggestion(aboveSuggestion);
                    event.preventDefault()
                }
                return;
            }
            else if (
                (event.which == me.KEY_DOWN || event.keyCode == me.KEY_DOWN) &&
                me.autocomplete.suggestions.childNodes.length > 1
            ) {
                var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.token-autocomplete-suggestion-highlighted');
                var belowSuggestion = (_b = highlightedSuggestion) === null || _b === void 0 ? void 0 : _b.nextSibling;
                if (belowSuggestion !== null) {
                    me.autocomplete.highlightSuggestion(belowSuggestion);
                }
                else if (me.autocomplete.suggestions.querySelectorAll('li').length) me.autocomplete.highlightSuggestionAtPosition(0);
                event.preventDefault()
                return false;
            }
            else {
                me.show()
                return true
            }
        });
        this.textInput.inputAutocomplete = this;
    }
    InputAutocomplete.prototype.show = function () {
        this.autocomplete.hideSuggestions();
        this.autocomplete.clearSuggestions();
        var value = this.textInput.value || '';
        if (value.length >= this.options.minCharactersForSuggestion) {
            if (this.suggestionCallback) {
                var suggestions = this.suggestionCallback(value);
                if (Array.isArray(suggestions)) {
                    suggestions.forEach(suggestion => this.autocomplete.addSuggestion(suggestion));
                    if (this.autocomplete.suggestions.childNodes.length > 0) {
                        this.autocomplete.highlightSuggestionAtPosition(0);
                    } else if (this.options.noMatchesText) {
                        this.showNone()
                    }
                } else if (this.options.noMatchesText) {
                    this.showNone()
                }
            }
        }
    }
    InputAutocomplete.prototype.display = function (suggestions) {
        this.autocomplete.hideSuggestions();
        this.autocomplete.clearSuggestions();
        if (Array.isArray(suggestions)) {
            suggestions.forEach(suggestion => this.autocomplete.addSuggestion(suggestion));
            if (this.autocomplete.suggestions.childNodes.length > 0) {
                this.autocomplete.highlightSuggestionAtPosition(0);
            } else if (this.options.noMatchesText) {
                this.showNone()
            }
        } else if (this.options.noMatchesText) {
            this.showNone()
        }
    };
    InputAutocomplete.prototype.showNone = function () {
        this.autocomplete.addSuggestion({
            value: '_no_match_',
            text: this.options.noMatchesText,
            description: null
        });
    };
    InputAutocomplete.prototype.hide = function () {
        this.autocomplete.clearSuggestions();
        this.autocomplete.hideSuggestions();
    };
    var _a;
    InputAutocomplete.Autocomplete = (_a = /** @class */ (function () {
        function Autocomplete(parent) {
            this.parent = parent;
            this.container = parent.container;
            this.options = parent.options;
            this.renderer = parent.options.suggestionRenderer;
            this.suggestions = document.createElement('ul');
            this.suggestions.id = this.container.id + '-suggestions';
            this.suggestions.classList.add('token-autocomplete-suggestions');
            this.container.appendChild(this.suggestions);
        }
        Autocomplete.prototype.hideSuggestions = function () {
            this.suggestions.style.display = '';
        };
        Autocomplete.prototype.showSuggestions = function () {
            this.suggestions.style.display = 'block';
        };
        Autocomplete.prototype.highlightSuggestionAtPosition = function (index) {
            var suggestions = this.suggestions.querySelectorAll('li');
            suggestions.forEach(function (suggestion) {
                suggestion.classList.remove('token-autocomplete-suggestion-highlighted');
            });
            suggestions[index].classList.add('token-autocomplete-suggestion-highlighted');
            //suggestions[index].scrollIntoViewIfNeeded()

        };
        Autocomplete.prototype.highlightSuggestion = function (suggestion) {
            this.suggestions.querySelectorAll('li').forEach(function (suggestion) {
                suggestion.classList.remove('token-autocomplete-suggestion-highlighted');
            });
            suggestion.classList.add('token-autocomplete-suggestion-highlighted');
            //suggestion.scrollIntoViewIfNeeded()
        };
        Autocomplete.prototype.clearSuggestions = function () {
            this.suggestions.innerHTML = '';
        };
        Autocomplete.prototype.addSuggestion = function (suggestion) {
            var element = this.renderer(suggestion),
                me = this;
            element.setAttribute('data-value', suggestion.value);
            element.suggestion = suggestion
            element.addEventListener('click', function (event) {
                if (suggestion.text == me.parent.options.noMatchesText) {
                    return true;
                }
                me.parent.onSelect && me.parent.onSelect(suggestion);
                event.stopImmediatePropagation();
                me.clearSuggestions();
                me.hideSuggestions();
            });
            if (this.container.querySelector('.token-autocomplete-token[data-text="' + suggestion.text + '"]') !== null) {
                element.classList.add('token-autocomplete-suggestion-active');
            }
            this.suggestions.appendChild(element);
            this.showSuggestions();
        };
        return Autocomplete;
    }()),
        _a.defaultRenderer = function (suggestion) {
            var option = document.createElement('li');
            option.innerHTML = suggestion.text;
            return option;
        },
        _a);
    return InputAutocomplete;
}());
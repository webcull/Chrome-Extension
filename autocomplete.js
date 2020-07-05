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
            var _a, _b;

            if (event.which == me.KEY_ENTER || event.keyCode == me.KEY_ENTER) {
                var highlightedSuggestion = me.autocomplete.suggestions.querySelector('.token-autocomplete-suggestion-highlighted');
                if (highlightedSuggestion !== null) {
                    event.preventDefault();
                    var value = highlightedSuggestion.getAttribute('data-value')
                    me.onSelect && me.onSelect(value)
                    me.autocomplete.clearSuggestions();
                    me.autocomplete.hideSuggestions();
                }

            }
            else if (
                (event.which == me.KEY_UP || event.keyCode == me.KEY_UP) &&
                me.autocomplete.suggestions.childNodes.length > 0
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
                me.autocomplete.suggestions.childNodes.length > 0
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
                me.autocomplete.hideSuggestions();
                me.autocomplete.clearSuggestions();
                var value = me.textInput.value || '';
                if (value.length >= me.options.minCharactersForSuggestion) {
                    if (me.suggestionCallback) {
                        var suggestions = me.suggestionCallback(value)
                        if (Array.isArray(suggestions)) {
                            suggestions.forEach(function (suggestion) {
                                me.autocomplete.addSuggestion(suggestion);
                            });
                            if (me.autocomplete.suggestions.childNodes.length > 0) {
                                me.autocomplete.highlightSuggestionAtPosition(0);
                            } else if (me.options.noMatchesText) {
                                me.autocomplete.addSuggestion({
                                    value: '_no_match_',
                                    text: me.options.noMatchesText,
                                    description: null
                                });
                            }
                        }
                    }
                }
                return
            }
            me.autocomplete.hideSuggestions();
            me.autocomplete.clearSuggestions();
        });

        this.container.inputAutocomplete = this;
    }
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
            suggestions[index].scrollIntoViewIfNeeded()

        };
        Autocomplete.prototype.highlightSuggestion = function (suggestion) {
            this.suggestions.querySelectorAll('li').forEach(function (suggestion) {
                suggestion.classList.remove('token-autocomplete-suggestion-highlighted');
            });
            suggestion.classList.add('token-autocomplete-suggestion-highlighted');
            suggestion.scrollIntoViewIfNeeded()
        };
        Autocomplete.prototype.clearSuggestions = function () {
            this.suggestions.innerHTML = '';
        };
        Autocomplete.prototype.addSuggestion = function (suggestion) {
            var element = this.renderer(suggestion),
                me = this;
            element.setAttribute('data-value', suggestion.value);
            element.addEventListener('click', function (_event) {
                var value = _event.target.getAttribute('data-value')
                console.log(value)
                me.parent.onSelect && me.parent.onSelect(value);
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
            option.textContent = suggestion.text;
            return option;
        },
        _a);
    return InputAutocomplete;
}());
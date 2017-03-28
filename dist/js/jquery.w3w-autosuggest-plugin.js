/*!
 * what3words autosuggest jQuery plugin
 * Copyright (C) 2017 what3words Limited
 * Licensed under the MIT license
 *
 * @author what3words
 * @version 1.2.0
 * @link https://github.com/what3words/jquery-plugin-w3w-autosuggest
 */

(function (factory) {
  /* global define */
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = function (root, jQuery) {
      if (jQuery === undefined) {
        if (typeof window !== 'undefined') {
          jQuery = require('jquery');
        } else {
          jQuery = require('jquery')(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    // Browser globals
    /* global jQuery */
    factory(jQuery);
  }
}(function ($) {
  'use strict';

  var pluginName = 'w3wAddress';

  /**
   * Create an instance of AutoSuggest
   *
   * @constructor
   * @param {Node} element The &lt;input&gt; element
   * @param {Object} options Options
   */
  var AutoSuggest = function (element, options) {
    this._api_end_point = 'https://api.what3words.com/v2/';
    this.element = element;
    this._name = pluginName;
    this._defaults = $.fn.w3wAddress.defaults;
    this.options = $.extend({}, this._defaults, options);
    this.init();
  };

  $.extend(AutoSuggest.prototype, {

    init: function () {
      // adds DOM elements arount input
      this.buildWrappers();
      // wire the typeahead plugin
      this.autoSuggest();
      // wire the validation plugin
      this.validation();
    },

    destroy: function () {
      this.unbindEvents();
      this.$element.removeData();
    },

    buildWrappers: function () {
      var direction = this.options.direction;

      $(this.element).wrapAll('<div class="typeahead__container ' + direction +
        '"><div class="typeahead__field"><span class="typeahead__query"></span></div></div>');

      $(this.element).closest('.typeahead__container').prepend(
        '<img class="w3w-logo" src="https://assets.prod.what3words.com/images/w3w_grid-logo.svg" alt="w3w-logo">'
      ).after('<div class="w3w__validation"></div>');

      $(this.element).addClass('w3w_valid').attr('placeholder', this.options.placeholder + ' ').attr(
        'autocomplete', 'off').attr('dir', 'auto').attr('aria-invalid', 'true');
    },

    bindEvents: function () {
      // var plugin = this;

    },

    unbindEvents: function () {
      this.$element.off('.' + this._name);
    },

    callback: function () {
      // Cache onComplete option
      var onComplete = this.options.onComplete;

      if (typeof onComplete === 'function') {
        onComplete.call(this.element);
      }
    },

    autoSuggest: function () {
      var twaPartialRegex = (/^(\D{1,})\.(\D{1,})\.(\D{1,})$/i);

      // DEBUG IF has key
      if (this.options.key === '' && this.options.debug) {
        console.log('No what3words API key found!');
        alert(
          'A what3words API key is required to use the AutoSuggest plugin. Information on how to register for a key can be found in the README'
        );
      } else {
        if (this.options.debug) {
          console.log('what3words API key: ' + this.options.key);
        }
      }

      // SET Arabic input direction
      if (this.options.lang === 'ar') {
        $(this.element).css('direction', 'rtl');
      }

      var _self = this;
      var counter = 0;
      var validationTypingTimer; // timer identifier

      $.typeahead({
        debug: true,
        input: $(this.element),
        minLength: 5, // x.x.x
        compression: true,
        hint: true,
        emptyTemplate: false,
        dynamic: true,
        delay: 700,
        maxItem: 20,
        source: {
          autosuggest: {
            filter: function (item, displayKey) {
              // apply a filter on the item.country property
              var selectedCountry = _self.options.country_filter;
              if (selectedCountry !== null) {
                // Debug info
                if (_self.options.debug) {
                  console.log('w3wAddress country_filter: ');
                  console.log($(_self.options.country_filter));
                  console.log('Selected Country is: ' + selectedCountry);
                  console.log('#################################');
                }

                if (item.country === selectedCountry) {
                  if (counter < _self.options.results) {
                    counter++;
                    return true; // Will add the item to the result list
                  }
                  return false; // Will skip the item
                } else {
                  return false;
                }
              } else {
                if (counter < _self.options.results) {
                  counter++;
                  return true; // Will add the item to the result list
                }
                // Will skip the item
              }
            },
            display: ['words'],
            template: function (query, item) {
              return [
                '<div class="list-inner">',
                '<span class="twa-flag w3w-flags-{{country}}">',
                '</span>',
                '<span class="twa">{{words}}</span>', '<br>',
                '<span class="info">', '{{place}}', '</span>',
                '</div>'
              ].join('\n');
            },
            ajax: function (query) {
              var m = twaPartialRegex.exec(query);
              if (m !== null) {
                var data = {
                  addr: '{{query}}',
                  format: 'json',
                  key: _self.options.key,
                  count: _self.options.count,
                  display: 'full'
                };

                if (typeof _self.options.lang !== 'undefined' && _self.options.lang) {
                  data.lang = _self.options.lang;
                }
                // if method is autosuggest, lang is mandatory and set default to 'en'
                if (!_self.options.multilingual && typeof data.lang === 'undefined') {
                  data.lang = 'en';
                }
                var autosuggest = _self.options.multilingual ? 'autosuggest-ml' : 'autosuggest';
                return {
                  type: 'GET',
                  url: _self._api_end_point + autosuggest,
                  data: data,
                  path: 'suggestions'
                };
              } else {
                // cancel request
                return false;
              }
            } // end ajax-autosuggest
          } // end standardblend
        },
        callback: {
          onSearch: function (node, query) {
            counter = 0; // Reset counter on every new search
            $(_self.element).attr('aria-invalid', true);
          },
          onInit: function (node) {
            // Debug
            if (_self.options.debug) {
              console.log('w3wAddress typeahead initiated on field: ' + node.selector);
            }
          },
          onResult: function (node, query, result, resultCount) {
            // console.log('callback::onResult() ' + result.length);
            if (query === '') {
              return;
            }
            var text = '';
            if (result.length === 0) {
              text = 'No results matching "' + query + '"';
            } else if (result.length > 0 && result.length < resultCount) {
              text = 'Showing ' + result.length + ' of ' + resultCount +
                ' elements matching "' + query + '"';
            } else if (result.length > 0) {
              text = 'Showing ' + result.length + ' elements matching addr= ' + query +
                '"';
            }
            text += ', with lang=' + _self.options.lang;
            if (typeof _self.options.focus !== 'undefined') {
              text += ', with focus=' + _self.options.focus;
            } else {
              text += ', without focus';
            }

            if (_self.options.debug) {
              console.log(text);
            }
          },
          onNavigateAfter: function (node, lis, a, item, query, event) {
            if (typeof item === 'undefined' || typeof item.words === 'undefined') {
              // marks input as a valid 3wa
              $(_self.element).attr('aria-invalid', true);
            } else {
              $(_self.element).attr('aria-invalid', false);
            }
          },
          onClickAfter: function (node, a, item, event) {
            if (_self.options.validation) {
              // validate field when result being clicked
              $(_self.element).closest('form').validate().element('.w3w_valid');
              $(_self.element).closest('.typeahead__container').nextAll('.w3w__validation').empty();
              if (!$(_self.element).closest('.typeahead__query').hasClass('valid')) {
                $(_self.element).closest('.typeahead__query').addClass('valid');
              }
              clearTimeout(validationTypingTimer);
              // user is "finished typing," run regex and validate
              var clearValidationMark = function () {
                // remove valid mark every time
                $(_self.element).closest('.typeahead__query').removeClass('valid');
              };
              validationTypingTimer = setTimeout(clearValidationMark, 500);
            }
            if (typeof item === 'undefined' || typeof item.words === 'undefined') {
              $(_self.element).attr('aria-invalid', true);
            } else {
              $(_self.element).attr('aria-invalid', false);
            }
          },
          onCancel: function (node, event) {
            if (_self.options.validation) {
              $(_self.element).closest('.typeahead__container').nextAll('.w3w__validation').empty();
            }
            $(_self.element).attr('aria-invalid', true);
          }
        } // callback
      });
    },

    validation: function () {
      // Return, don't run validation if Options set validation to false
      if (this.options.validation === false) {
        return;
      }

      // log Debug
      if (this.options.debug) {
        console.log('Validating the w3wAddress field');
      }

      var noMatchingCountry = false;

      var _self = this;

      // Create a Custom W3W address validation
      $.validator.addMethod('w3w_valid', function (value, element) {
        // IF empty
        if (this.optional(element) || value.replace(/ /g, '') === '') {
          // send valid for empty
          return true;
        } else {
          // IF has content
          var isSuccess = false;
          var twaRegex = (/^(\D{3,})\.(\D{3,})\.(\D{3,})$/i);
          var m = twaRegex.exec(value);
          if (m !== null) {
            // check from result list first
            var suggestions = $(element).closest('.typeahead__container').find('span.twa');
            if (typeof suggestions !== 'undefined' && suggestions.length > 0) {
              for (var i = 0; i < suggestions.length && !isSuccess; i++) {
                if (suggestions[i].innerText === value) {
                  isSuccess = true;
                }
              }
            }
            // still not a sucess ?
            if (!isSuccess) {
              // check with a forward geocoding
              $.ajax({
                url: _self._api_end_point + 'forward',
                type: 'GET',
                async: false,
                data: {
                  addr: value,
                  key: _self.options.key,
                  format: 'json'
                },
                dataType: 'json',
                success: function (result) {
                  var response = result;
                  // If W3A is VALID
                  if (response.hasOwnProperty('geometry')) {
                    isSuccess = true;
                  }
                } // end success
              });
            }
          }
          return isSuccess;
        }
      }, function () {
        // not implemented yet
        if (noMatchingCountry === true) {
          return _self.options.valid_country_error;
        } else {
          return _self.options.valid_error;
        }
      });

      // Add Custom W3W validation to $validator
      $.validator.addClassRules('w3w_valid', {
        w3w_valid: true
      });

      var typingTimer; // timer identifier
      var doneTypingInterval = 500;
      var regex = /^(\D{1,})\.(\D{1,})\.(\D{1,})$/i;

      // Init validation
      $(this.element).closest('form').validate({
        onfocusout: false,
        onkeyup: function (element) {
          if ($(element).hasClass('w3w_valid')) {
            clearTimeout(typingTimer);

            // user is "finished typing," run regex and validate
            var doneTyping = function () {
              // remove valid mark every time
              $(element).closest('.typeahead__query').removeClass('valid');

              // Only check for validation when regex match
              if (regex.test($(element).val())) {
                $(element).valid();
              }
            };

            typingTimer = setTimeout(doneTyping, doneTypingInterval);
          }
        },
        errorPlacement: function (error, element) {
          var valid_container = element.closest('.typeahead__container');
          error.appendTo(valid_container.siblings('.w3w__validation'));
        }
      });
    }
  });

  /**
   * [w3wAddress description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  $.fn.w3wAddress = function (options) {
    this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new AutoSuggest(this, options));
      }
    });
    return this;
  };

  /**
   * Default plugin options
   *
   * @type {object}
   */
  $.fn.w3wAddress.defaults = {
    country_filter: null,
    key: '',
    debug: false,
    count: 50,
    results: 3,
    lang: 'en',
    multilingual: true,
    direction: 'ltr',
    placeholder: 'e.g. lock.spout.radar',
    validation: true,
    valid_error: 'Please enter a valid 3 word address.',
    typeaheadDelay: 300
  };
}));

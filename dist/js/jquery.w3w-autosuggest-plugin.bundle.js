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

/*!
 * jQuery Typeahead
 * Copyright (C) 2017 RunningCoder.org
 * Licensed under the MIT license
 *
 * @author Tom Bertrand
 * @version 2.8.0 (2017-3-1)
 * @link http://www.runningcoder.org/jquerytypeahead/
 */
!function(t){"function"==typeof define&&define.amd?define("jquery-typeahead",["jquery"],function(e){return t(e)}):"object"==typeof module&&module.exports?module.exports=function(e,i){return void 0===e&&(e="undefined"!=typeof window?require("jquery"):require("jquery")(i)),t(e)}():t(jQuery)}(function(t){"use strict";window.Typeahead={version:"2.8.0"};var e={input:null,minLength:2,maxLength:!1,maxItem:8,dynamic:!1,delay:300,order:null,offset:!1,hint:!1,accent:!1,highlight:!0,group:!1,groupOrder:null,maxItemPerGroup:null,dropdownFilter:!1,dynamicFilter:null,backdrop:!1,backdropOnFocus:!1,cache:!1,ttl:36e5,compression:!1,searchOnFocus:!1,blurOnTab:!0,resultContainer:null,generateOnLoad:null,mustSelectItem:!1,href:null,display:["display"],template:null,templateValue:null,groupTemplate:null,correlativeTemplate:!1,emptyTemplate:!1,cancelButton:!0,loadingAnimation:!0,filter:!0,matcher:null,source:null,callback:{onInit:null,onReady:null,onShowLayout:null,onHideLayout:null,onSearch:null,onResult:null,onLayoutBuiltBefore:null,onLayoutBuiltAfter:null,onNavigateBefore:null,onNavigateAfter:null,onMouseEnter:null,onMouseLeave:null,onClickBefore:null,onClickAfter:null,onDropdownFilter:null,onSendRequest:null,onReceiveRequest:null,onPopulateSource:null,onCacheSave:null,onSubmit:null,onCancel:null},selector:{container:"typeahead__container",result:"typeahead__result",list:"typeahead__list",group:"typeahead__group",item:"typeahead__item",empty:"typeahead__empty",display:"typeahead__display",query:"typeahead__query",filter:"typeahead__filter",filterButton:"typeahead__filter-button",dropdown:"typeahead__dropdown",dropdownItem:"typeahead__dropdown-item",button:"typeahead__button",backdrop:"typeahead__backdrop",hint:"typeahead__hint",cancelButton:"typeahead__cancel-button"},debug:!1},i=".typeahead",o={from:"ãàáäâẽèéëêìíïîõòóöôùúüûñç",to:"aaaaaeeeeeiiiiooooouuuunc"},s=~window.navigator.appVersion.indexOf("MSIE 9."),n=~window.navigator.appVersion.indexOf("MSIE 10"),r=~window.navigator.userAgent.indexOf("Trident")&&~window.navigator.userAgent.indexOf("rv:11"),a=function(t,e){this.rawQuery=t.val()||"",this.query=t.val()||"",this.selector=t[0].selector,this.deferred=null,this.tmpSource={},this.source={},this.dynamicGroups=[],this.hasDynamicGroups=!1,this.generatedGroupCount=0,this.groupBy="group",this.groups=[],this.searchGroups=[],this.generateGroups=[],this.requestGroups=[],this.result={},this.groupTemplate="",this.resultHtml=null,this.resultCount=0,this.resultCountPerGroup={},this.options=e,this.node=t,this.namespace="."+this.helper.slugify.call(this,this.selector)+i,this.container=null,this.resultContainer=null,this.item=null,this.xhr={},this.hintIndex=null,this.filters={dropdown:{},dynamic:{}},this.dropdownFilter={"static":[],dynamic:[]},this.dropdownFilterAll=null,this.isDropdownEvent=!1,this.requests={},this.backdrop={},this.hint={},this.hasDragged=!1,this.focusOnly=!1,this.__construct()};a.prototype={_validateCacheMethod:function(t){var e,i=["localStorage","sessionStorage"];if(t===!0)t="localStorage";else if("string"==typeof t&&!~i.indexOf(t))return!1;e="undefined"!=typeof window[t];try{window[t].setItem("typeahead","typeahead"),window[t].removeItem("typeahead")}catch(o){e=!1}return e&&t||!1},extendOptions:function(){if(this.options.cache=this._validateCacheMethod(this.options.cache),this.options.compression&&("object"==typeof LZString&&this.options.cache||(this.options.compression=!1)),(!this.options.maxLength||isNaN(this.options.maxLength))&&(this.options.maxLength=1/0),"undefined"!=typeof this.options.maxItem&&~[0,!1].indexOf(this.options.maxItem)&&(this.options.maxItem=1/0),this.options.maxItemPerGroup&&!/^\d+$/.test(this.options.maxItemPerGroup)&&(this.options.maxItemPerGroup=null),this.options.display&&!Array.isArray(this.options.display)&&(this.options.display=[this.options.display]),this.options.group&&(Array.isArray(this.options.group)||("string"==typeof this.options.group?this.options.group={key:this.options.group}:"boolean"==typeof this.options.group&&(this.options.group={key:"group"}),this.options.group.key=this.options.group.key||"group")),this.options.highlight&&!~["any",!0].indexOf(this.options.highlight)&&(this.options.highlight=!1),this.options.dropdownFilter&&this.options.dropdownFilter instanceof Object){Array.isArray(this.options.dropdownFilter)||(this.options.dropdownFilter=[this.options.dropdownFilter]);for(var i=0,s=this.options.dropdownFilter.length;s>i;++i)this.dropdownFilter[this.options.dropdownFilter[i].value?"static":"dynamic"].push(this.options.dropdownFilter[i])}this.options.dynamicFilter&&!Array.isArray(this.options.dynamicFilter)&&(this.options.dynamicFilter=[this.options.dynamicFilter]),this.options.accent&&("object"==typeof this.options.accent?this.options.accent.from&&this.options.accent.to&&this.options.accent.from.length===this.options.accent.to.length:this.options.accent=o),this.options.groupTemplate&&(this.groupTemplate=this.options.groupTemplate),this.options.resultContainer&&("string"==typeof this.options.resultContainer&&(this.options.resultContainer=t(this.options.resultContainer)),this.options.resultContainer instanceof t&&this.options.resultContainer[0]&&(this.resultContainer=this.options.resultContainer)),this.options.maxItemPerGroup&&this.options.group&&this.options.group.key&&(this.groupBy=this.options.group.key),this.options.callback&&this.options.callback.onClick&&(this.options.callback.onClickBefore=this.options.callback.onClick,delete this.options.callback.onClick),this.options.callback&&this.options.callback.onNavigate&&(this.options.callback.onNavigateBefore=this.options.callback.onNavigate,delete this.options.callback.onNavigate),this.options=t.extend(!0,{},e,this.options)},unifySourceFormat:function(){this.dynamicGroups=[],Array.isArray(this.options.source)&&(this.options.source={group:{data:this.options.source}}),"string"==typeof this.options.source&&(this.options.source={group:{ajax:{url:this.options.source}}}),this.options.source.ajax&&(this.options.source={group:{ajax:this.options.source.ajax}}),(this.options.source.url||this.options.source.data)&&(this.options.source={group:this.options.source});var t,e,i;for(t in this.options.source)if(this.options.source.hasOwnProperty(t)){if(e=this.options.source[t],"string"==typeof e&&(e={ajax:{url:e}}),i=e.url||e.ajax,Array.isArray(i)?(e.ajax="string"==typeof i[0]?{url:i[0]}:i[0],e.ajax.path=e.ajax.path||i[1]||null,delete e.url):("object"==typeof e.url?e.ajax=e.url:"string"==typeof e.url&&(e.ajax={url:e.url}),delete e.url),!e.data&&!e.ajax)return!1;e.display&&!Array.isArray(e.display)&&(e.display=[e.display]),e.minLength="number"==typeof e.minLength?e.minLength:this.options.minLength,e.maxLength="number"==typeof e.maxLength?e.maxLength:this.options.maxLength,e.dynamic="boolean"==typeof e.dynamic||this.options.dynamic,e.minLength>e.maxLength&&(e.minLength=e.maxLength),this.options.source[t]=e,this.options.source[t].dynamic&&this.dynamicGroups.push(t),e.cache="undefined"!=typeof e.cache?this._validateCacheMethod(e.cache):this.options.cache,e.compression&&("object"==typeof LZString&&e.cache||(e.compression=!1))}return this.hasDynamicGroups=this.options.dynamic||!!this.dynamicGroups.length,!0},init:function(){this.helper.executeCallback.call(this,this.options.callback.onInit,[this.node]),this.container=this.node.closest("."+this.options.selector.container)},delegateEvents:function(){var e=this,i=["focus"+this.namespace,"input"+this.namespace,"propertychange"+this.namespace,"keydown"+this.namespace,"keyup"+this.namespace,"search"+this.namespace,"generate"+this.namespace];t("html").on("touchmove",function(){e.hasDragged=!0}).on("touchstart",function(){e.hasDragged=!1}),this.node.closest("form").on("submit",function(t){return e.options.mustSelectItem&&e.helper.isEmpty(e.item)?void t.preventDefault():(e.options.backdropOnFocus||e.hideLayout(),e.options.callback.onSubmit?e.helper.executeCallback.call(e,e.options.callback.onSubmit,[e.node,this,e.item,t]):void 0)}).on("reset",function(){setTimeout(function(){e.node.trigger("input"+e.namespace),e.hideLayout()})});var o=!1;if(this.node.attr("placeholder")&&(n||r)){var a=!0;this.node.on("focusin focusout",function(){a=!(this.value||!this.placeholder)}),this.node.on("input",function(t){a&&(t.stopImmediatePropagation(),a=!1)})}this.node.off(this.namespace).on(i.join(" "),function(i,n){switch(i.type){case"generate":e.generateSource(Object.keys(e.options.source));break;case"focus":if(e.focusOnly){e.focusOnly=!1;break}e.options.backdropOnFocus&&(e.buildBackdropLayout(),e.showLayout()),e.options.searchOnFocus&&(e.deferred=t.Deferred(),e.generateSource());break;case"keydown":i.keyCode&&~[9,13,27,38,39,40].indexOf(i.keyCode)&&(o=!0,e.navigate(i));break;case"keyup":s&&e.node[0].value.replace(/^\s+/,"").toString().length<e.query.length&&e.node.trigger("input"+e.namespace);break;case"propertychange":if(o){o=!1;break}case"input":e.deferred=t.Deferred(),e.rawQuery=e.node[0].value.toString(),e.query=e.rawQuery.replace(/^\s+/,""),""===e.rawQuery&&""===e.query&&(i.originalEvent=n||{},e.helper.executeCallback.call(e,e.options.callback.onCancel,[e.node,i])),e.options.cancelButton&&e.toggleCancelButtonVisibility(),e.options.hint&&e.hint.container&&""!==e.hint.container.val()&&0!==e.hint.container.val().indexOf(e.rawQuery)&&e.hint.container.val(""),e.hasDynamicGroups?e.helper.typeWatch(function(){e.generateSource()},e.options.delay):e.generateSource();break;case"search":e.searchResult(),e.buildLayout(),e.result.length||e.searchGroups.length&&e.options.emptyTemplate&&e.query.length?e.showLayout():e.hideLayout(),e.deferred&&e.deferred.resolve()}return e.deferred&&e.deferred.promise()}),this.options.generateOnLoad&&this.node.trigger("generate"+this.namespace)},filterGenerateSource:function(){this.searchGroups=[],this.generateGroups=[];for(var t in this.options.source)if(this.options.source.hasOwnProperty(t)&&this.query.length>=this.options.source[t].minLength&&this.query.length<=this.options.source[t].maxLength){if(this.searchGroups.push(t),!this.options.source[t].dynamic&&this.source[t])continue;this.generateGroups.push(t)}},generateSource:function(e){if(this.filterGenerateSource(),Array.isArray(e)&&e.length)this.generateGroups=e;else if(!this.generateGroups.length)return void this.node.trigger("search"+this.namespace);if(this.requestGroups=[],this.generatedGroupCount=0,this.options.loadingAnimation&&this.container.addClass("loading"),!this.helper.isEmpty(this.xhr)){for(var i in this.xhr)this.xhr.hasOwnProperty(i)&&this.xhr[i].abort();this.xhr={}}for(var o,s,n,r,a,l,h,c=this,i=0,u=this.generateGroups.length;u>i;++i){if(o=this.generateGroups[i],n=this.options.source[o],r=n.cache,a=n.compression,r&&(l=window[r].getItem("TYPEAHEAD_"+this.selector+":"+o))){a&&(l=LZString.decompressFromUTF16(l)),h=!1;try{l=JSON.parse(l+""),l.data&&l.ttl>(new Date).getTime()?(this.populateSource(l.data,o),h=!0):window[r].removeItem("TYPEAHEAD_"+this.selector+":"+o)}catch(p){}if(h)continue}!n.data||n.ajax?n.ajax&&(this.requests[o]||(this.requests[o]=this.generateRequestObject(o)),this.requestGroups.push(o)):"function"==typeof n.data?(s=n.data.call(this),Array.isArray(s)?c.populateSource(s,o):"function"==typeof s.promise&&!function(e){t.when(s).then(function(t){t&&Array.isArray(t)&&c.populateSource(t,e)})}(o)):this.populateSource(t.extend(!0,[],n.data),o)}return this.requestGroups.length&&this.handleRequests(),!!this.generateGroups.length},generateRequestObject:function(t){var e=this,i=this.options.source[t],o={request:{url:i.ajax.url||null,dataType:"json",beforeSend:function(o,s){e.xhr[t]=o;var n=e.requests[t].callback.beforeSend||i.ajax.beforeSend;"function"==typeof n&&n.apply(null,arguments)}},callback:{beforeSend:null,done:null,fail:null,then:null,always:null},extra:{path:i.ajax.path||null,group:t},validForGroup:[t]};if("function"!=typeof i.ajax&&(i.ajax instanceof Object&&(o=this.extendXhrObject(o,i.ajax)),Object.keys(this.options.source).length>1))for(var s in this.requests)this.requests.hasOwnProperty(s)&&(this.requests[s].isDuplicated||o.request.url&&o.request.url===this.requests[s].request.url&&(this.requests[s].validForGroup.push(t),o.isDuplicated=!0,delete o.validForGroup));return o},extendXhrObject:function(e,i){return"object"==typeof i.callback&&(e.callback=i.callback,delete i.callback),"function"==typeof i.beforeSend&&(e.callback.beforeSend=i.beforeSend,delete i.beforeSend),e.request=t.extend(!0,e.request,i),"jsonp"!==e.request.dataType.toLowerCase()||e.request.jsonpCallback||(e.request.jsonpCallback="callback_"+e.extra.group),e},handleRequests:function(){var e,i=this,o=this.requestGroups.length;if(this.helper.executeCallback.call(this,this.options.callback.onSendRequest,[this.node,this.query])!==!1)for(var s=0,n=this.requestGroups.length;n>s;++s)e=this.requestGroups[s],this.requests[e].isDuplicated||!function(e,s){if("function"==typeof i.options.source[e].ajax){var n=i.options.source[e].ajax.call(i,i.query);if(s=i.extendXhrObject(i.generateRequestObject(e),"object"==typeof n?n:{}),"object"!=typeof s.request||!s.request.url)return void i.populateSource([],e);i.requests[e]=s}var r,a,l=!1;if(~s.request.url.indexOf("{{query}}")&&(l||(s=t.extend(!0,{},s),l=!0),s.request.url=s.request.url.replace("{{query}}",encodeURIComponent(i.query))),s.request.data)for(var h in s.request.data)if(s.request.data.hasOwnProperty(h)&&~String(s.request.data[h]).indexOf("{{query}}")){l||(s=t.extend(!0,{},s),l=!0),s.request.data[h]=s.request.data[h].replace("{{query}}",i.query);break}t.ajax(s.request).done(function(t,e,o){a=null;for(var n=0,l=s.validForGroup.length;l>n;n++)r=i.requests[s.validForGroup[n]],r.callback.done instanceof Function&&(a=r.callback.done.call(i,t,e,o))}).fail(function(t,e,o){for(var n=0,a=s.validForGroup.length;a>n;n++)r=i.requests[s.validForGroup[n]],r.callback.fail instanceof Function&&r.callback.fail.call(i,t,e,o)}).always(function(t,e,n){for(var l=0,h=s.validForGroup.length;h>l;l++){if(r=i.requests[s.validForGroup[l]],r.callback.always instanceof Function&&r.callback.always.call(i,t,e,n),"object"!=typeof n)return;i.populateSource("function"==typeof t.promise&&[]||a||t,r.extra.group,r.extra.path||r.request.path),o-=1,0===o&&i.helper.executeCallback.call(i,i.options.callback.onReceiveRequest,[i.node,i.query])}}).then(function(t,e){for(var o=0,n=s.validForGroup.length;n>o;o++)r=i.requests[s.validForGroup[o]],r.callback.then instanceof Function&&r.callback.then.call(i,t,e)})}(e,this.requests[e])},populateSource:function(t,e,i){var o=this,s=this.options.source[e],n=s.ajax&&s.data;i&&"string"==typeof i&&(t=this.helper.namespace.call(this,i,t)),Array.isArray(t)||(t=[]),n&&("function"==typeof n&&(n=n()),Array.isArray(n)&&(t=t.concat(n)));for(var r,a=s.display?"compiled"===s.display[0]?s.display[1]:s.display[0]:"compiled"===this.options.display[0]?this.options.display[1]:this.options.display[0],l=0,h=t.length;h>l;l++)null!==t[l]&&"boolean"!=typeof t[l]&&("string"==typeof t[l]&&(r={},r[a]=t[l],t[l]=r),t[l].group=e);if(!this.hasDynamicGroups&&this.dropdownFilter.dynamic.length)for(var c,u,p={},l=0,h=t.length;h>l;l++)for(var d=0,f=this.dropdownFilter.dynamic.length;f>d;d++)c=this.dropdownFilter.dynamic[d].key,u=t[l][c],u&&(this.dropdownFilter.dynamic[d].value||(this.dropdownFilter.dynamic[d].value=[]),p[c]||(p[c]=[]),~p[c].indexOf(u.toLowerCase())||(p[c].push(u.toLowerCase()),this.dropdownFilter.dynamic[d].value.push(u)));if(this.options.correlativeTemplate){var y=s.template||this.options.template,g="";if("function"==typeof y&&(y=y.call(this,"",{})),y){if(Array.isArray(this.options.correlativeTemplate))for(var l=0,h=this.options.correlativeTemplate.length;h>l;l++)g+="{{"+this.options.correlativeTemplate[l]+"}} ";else g=y.replace(/<.+?>/g,"");for(var l=0,h=t.length;h>l;l++)t[l].compiled=g.replace(/\{\{([\w\-\.]+)(?:\|(\w+))?}}/g,function(e,i){return o.helper.namespace.call(o,i,t[l],"get","")}).trim();s.display?~s.display.indexOf("compiled")||s.display.unshift("compiled"):~this.options.display.indexOf("compiled")||this.options.display.unshift("compiled")}else;}this.options.callback.onPopulateSource&&(t=this.helper.executeCallback.call(this,this.options.callback.onPopulateSource,[this.node,t,e,i])),this.tmpSource[e]=Array.isArray(t)&&t||[];var m=this.options.source[e].cache,v=this.options.source[e].compression,b=this.options.source[e].ttl||this.options.ttl;if(m&&!window[m].getItem("TYPEAHEAD_"+this.selector+":"+e)){this.options.callback.onCacheSave&&(t=this.helper.executeCallback.call(this,this.options.callback.onCacheSave,[this.node,t,e,i]));var k=JSON.stringify({data:t,ttl:(new Date).getTime()+b});v&&(k=LZString.compressToUTF16(k)),window[m].setItem("TYPEAHEAD_"+this.selector+":"+e,k)}this.incrementGeneratedGroup()},incrementGeneratedGroup:function(){if(this.generatedGroupCount++,this.generatedGroupCount===this.generateGroups.length){this.xhr={};for(var t=0,e=this.generateGroups.length;e>t;t++)this.source[this.generateGroups[t]]=this.tmpSource[this.generateGroups[t]];this.hasDynamicGroups||this.buildDropdownItemLayout("dynamic"),this.options.loadingAnimation&&this.container.removeClass("loading"),this.node.trigger("search"+this.namespace)}},navigate:function(t){if(this.helper.executeCallback.call(this,this.options.callback.onNavigateBefore,[this.node,this.query,t]),27===t.keyCode)return t.preventDefault(),void(this.query.length?(this.resetInput(),this.node.trigger("input"+this.namespace,[t])):(this.node.blur(),this.hideLayout()));if(this.options.blurOnTab&&9===t.keyCode)return this.node.blur(),void this.hideLayout();if(this.result.length){var e=this.resultContainer.find("."+this.options.selector.item),i=e.filter(".active"),o=i[0]&&e.index(i)||null,s=null;if(13===t.keyCode)return void(i.length>0&&(t.preventDefault(),i.find("a:first").trigger("click",t)));if(39===t.keyCode)return void(o?e.eq(o).find("a:first")[0].click():this.options.hint&&""!==this.hint.container.val()&&this.helper.getCaret(this.node[0])>=this.query.length&&e.find('a[data-index="'+this.hintIndex+'"]')[0].click());e.length>0&&i.removeClass("active"),38===t.keyCode?(t.preventDefault(),i.length>0?o-1>=0&&(s=o-1,e.eq(s).addClass("active")):(s=e.length-1,e.last().addClass("active"))):40===t.keyCode&&(t.preventDefault(),i.length>0?o+1<e.length&&(s=o+1,e.eq(s).addClass("active")):(s=0,e.first().addClass("active"))),t.preventInputChange&&~[38,40].indexOf(t.keyCode)&&this.buildHintLayout(null!==s&&s<this.result.length?[this.result[s]]:null),this.options.hint&&this.hint.container&&this.hint.container.css("color",t.preventInputChange?this.hint.css.color:null===s&&this.hint.css.color||this.hint.container.css("background-color")||"fff"),this.node.val(null===s||t.preventInputChange?this.rawQuery:this.result[s][this.result[s].matchedKey]),this.helper.executeCallback.call(this,this.options.callback.onNavigateAfter,[this.node,e,null!==s&&e.eq(s).find("a:first")||void 0,null!==s&&this.result[s]||void 0,this.query,t])}},searchResult:function(t){t||(this.item={}),this.resetLayout(),this.helper.executeCallback.call(this,this.options.callback.onSearch,[this.node,this.query])!==!1&&(this.searchGroups.length&&this.searchResultData(),this.helper.executeCallback.call(this,this.options.callback.onResult,[this.node,this.query,this.result,this.resultCount,this.resultCountPerGroup]),this.isDropdownEvent&&(this.helper.executeCallback.call(this,this.options.callback.onDropdownFilter,[this.node,this.query,this.filters.dropdown,this.result]),this.isDropdownEvent=!1))},searchResultData:function(){var e,i,o,s,n,r,a,l,h,c,u,p,d,f=this,y=this.groupBy,g=null,m=this.query.toLowerCase(),v=this.options.maxItem,b=this.options.maxItemPerGroup,k=this.filters.dynamic&&!this.helper.isEmpty(this.filters.dynamic),w="function"==typeof this.options.matcher&&this.options.matcher;this.options.accent&&(m=this.helper.removeAccent.call(this,m));for(var x=0,C=this.searchGroups.length;C>x;++x)if(e=this.searchGroups[x],!this.filters.dropdown||"group"!==this.filters.dropdown.key||this.filters.dropdown.value===e){a="undefined"!=typeof this.options.source[e].filter?this.options.source[e].filter:this.options.filter,h="function"==typeof this.options.source[e].matcher&&this.options.source[e].matcher||w;for(var q=0,O=this.source[e].length;O>q&&(!(this.resultItemCount>=v)||this.options.callback.onResult);q++)if((!k||this.dynamicFilter.validate.apply(this,[this.source[e][q]]))&&(i=this.source[e][q],null!==i&&"boolean"!=typeof i&&(!this.filters.dropdown||(i[this.filters.dropdown.key]||"").toLowerCase()===(this.filters.dropdown.value||"").toLowerCase()))){if(g="group"===y?e:i[y]?i[y]:i.group,g&&!this.result[g]&&(this.result[g]=[],this.resultCountPerGroup[g]=0),b&&"group"===y&&this.result[g].length>=b&&!this.options.callback.onResult)break;n=this.options.source[e].display||this.options.display;for(var S=0,F=n.length;F>S;++S){if(a!==!1){if(r=/\./.test(n[S])?this.helper.namespace.call(this,n[S],i):i[n[S]],"undefined"==typeof r||""===r)continue;r=this.helper.cleanStringFromScript(r)}if("function"==typeof a){if(l=a.call(this,i,r),void 0===l)break;if(!l)continue;"object"==typeof l&&(i=l)}if(~[void 0,!0].indexOf(a)){if(s=r,s=s.toString().toLowerCase(),this.options.accent&&(s=this.helper.removeAccent.call(this,s)),o=s.indexOf(m),this.options.correlativeTemplate&&"compiled"===n[S]&&0>o&&/\s/.test(m)){u=!0,p=m.split(" "),d=s;for(var L=0,A=p.length;A>L;L++)if(""!==p[L]){if(!~d.indexOf(p[L])){u=!1;break}d=d.replace(p[L],"")}}if(0>o&&!u)continue;if(this.options.offset&&0!==o)continue;if(h){if(c=h.call(this,i,r),void 0===c)break;if(!c)continue;"object"==typeof c&&(i=c)}}if(this.resultCount++,this.resultCountPerGroup[g]++,this.resultItemCount<v){if(b&&this.result[g].length>=b)break;this.result[g].push(t.extend(!0,{matchedKey:n[S]},i)),this.resultItemCount++}break}if(!this.options.callback.onResult){if(this.resultItemCount>=v)break;if(b&&this.result[g].length>=b&&"group"===y)break}}}if(this.options.order){var j,n=[];for(var e in this.result)if(this.result.hasOwnProperty(e)){for(var x=0,C=this.result[e].length;C>x;x++)j=this.options.source[this.result[e][x].group].display||this.options.display,~n.indexOf(j[0])||n.push(j[0]);this.result[e].sort(f.helper.sort(n,"asc"===f.options.order,function(t){return t.toString().toUpperCase()}))}}var G=[],T=[];T="function"==typeof this.options.groupOrder?this.options.groupOrder.apply(this,[this.node,this.query,this.result,this.resultCount,this.resultCountPerGroup]):Array.isArray(this.options.groupOrder)?this.options.groupOrder:"string"==typeof this.options.groupOrder&&~["asc","desc"].indexOf(this.options.groupOrder)?Object.keys(this.result).sort(f.helper.sort([],"asc"===f.options.groupOrder,function(t){return t.toString().toUpperCase()})):Object.keys(this.result);for(var x=0,C=T.length;C>x;x++)G=G.concat(this.result[T[x]]||[]);this.groups=JSON.parse(JSON.stringify(T)),this.result=G},buildLayout:function(){if(this.buildHtmlLayout(),this.buildBackdropLayout(),this.buildHintLayout(),this.options.callback.onLayoutBuiltBefore){var e=this.helper.executeCallback.call(this,this.options.callback.onLayoutBuiltBefore,[this.node,this.query,this.result,this.resultHtml]);e instanceof t&&(this.resultHtml=e)}this.resultHtml&&this.resultContainer.html(this.resultHtml),this.options.callback.onLayoutBuiltAfter&&this.helper.executeCallback.call(this,this.options.callback.onLayoutBuiltAfter,[this.node,this.query,this.result])},buildHtmlLayout:function(){if(this.options.resultContainer!==!1){this.resultContainer||(this.resultContainer=t("<div/>",{"class":this.options.selector.result}),this.container.append(this.resultContainer));var e;if(!this.result.length){if(!this.options.emptyTemplate||""===this.query)return;e="function"==typeof this.options.emptyTemplate?this.options.emptyTemplate.call(this,this.query):this.options.emptyTemplate.replace(/\{\{query}}/gi,this.helper.cleanStringFromScript(this.query))}var i=this.query.toLowerCase();this.options.accent&&(i=this.helper.removeAccent.call(this,i));var o=this,s=this.groupTemplate||"<ul></ul>",n=!1;this.groupTemplate?s=t(s.replace(/<([^>]+)>\{\{(.+?)}}<\/[^>]+>/g,function(t,i,s,r,a){var l="",h="group"===s?o.groups:[s];if(!o.result.length)return n===!0?"":(n=!0,"<"+i+' class="'+o.options.selector.empty+'"><a href="javascript:;">'+e+"</a></"+i+">");for(var c=0,u=h.length;u>c;++c)l+="<"+i+' data-group-template="'+h[c]+'"><ul></ul></'+i+">";return l})):(s=t(s),this.result.length||s.append(e instanceof t?e:'<li class="'+o.options.selector.empty+'"><a href="javascript:;">'+e+"</a></li>")),s.addClass(this.options.selector.list+(this.helper.isEmpty(this.result)?" empty":""));for(var r,a,l,h,c,u,p,d,f,y,g,m,v=this.groupTemplate&&this.result.length&&o.groups||[],b=0,k=this.result.length;k>b;++b)l=this.result[b],r=l.group,h=this.options.source[l.group].href||this.options.href,f=[],y=this.options.source[l.group].display||this.options.display,this.options.group&&(r=l[this.options.group.key],this.options.group.template&&("function"==typeof this.options.group.template?a=this.options.group.template(l):"string"==typeof this.options.template&&(a=this.options.group.template.replace(/\{\{([\w\-\.]+)}}/gi,function(t,e){return o.helper.namespace.call(o,e,l,"get","")}))),s.find('[data-search-group="'+r+'"]')[0]||(this.groupTemplate?s.find('[data-group-template="'+r+'"] ul'):s).append(t("<li/>",{"class":o.options.selector.group,html:t("<a/>",{href:"javascript:;",html:a||r,tabindex:-1}),"data-search-group":r}))),this.groupTemplate&&v.length&&(m=v.indexOf(r||l.group),~m&&v.splice(m,1)),c=t("<li/>",{"class":o.options.selector.item+" "+o.options.selector.group+"-"+this.helper.slugify.call(this,r),html:t("<a/>",{href:function(){return h&&("string"==typeof h?h=h.replace(/\{\{([^\|}]+)(?:\|([^}]+))*}}/gi,function(t,e,i){var s=o.helper.namespace.call(o,e,l,"get","");return i=i&&i.split("|")||[],~i.indexOf("slugify")&&(s=o.helper.slugify.call(o,s)),s}):"function"==typeof h&&(h=h(l)),l.href=h),h||"javascript:;"}(),"data-group":r,"data-index":b,html:function(){if(u=l.group&&o.options.source[l.group].template||o.options.template)"function"==typeof u&&(u=u.call(o,o.query,l)),d=u.replace(/\{\{([^\|}]+)(?:\|([^}]+))*}}/gi,function(t,e,s){var n=o.helper.cleanStringFromScript(String(o.helper.namespace.call(o,e,l,"get","")));return s=s&&s.split("|")||[],~s.indexOf("slugify")&&(n=o.helper.slugify.call(o,n)),~s.indexOf("raw")||o.options.highlight===!0&&i&&~y.indexOf(e)&&(n=o.helper.highlight.call(o,n,i.split(" "),o.options.accent)),n});else{for(var e=0,s=y.length;s>e;e++)g=/\./.test(y[e])?o.helper.namespace.call(o,y[e],l,"get",""):l[y[e]],"undefined"!=typeof g&&""!==g&&f.push(g);d='<span class="'+o.options.selector.display+'">'+o.helper.cleanStringFromScript(String(f.join(" ")))+"</span>"}(o.options.highlight===!0&&i&&!u||"any"===o.options.highlight)&&(d=o.helper.highlight.call(o,d,i.split(" "),o.options.accent)),t(this).append(d)}})}),function(e,i,s){s.on("click",function(e,s){return s&&"object"==typeof s&&(e.originalEvent=s),o.options.mustSelectItem&&o.helper.isEmpty(i)?void e.preventDefault():(o.item=i,void(o.helper.executeCallback.call(o,o.options.callback.onClickBefore,[o.node,t(this),i,e])!==!1&&(e.originalEvent&&e.originalEvent.defaultPrevented||e.isDefaultPrevented()||(p=i.group&&o.options.source[i.group].templateValue||o.options.templateValue,"function"==typeof p&&(p=p.call(o)),o.query=o.rawQuery=p?p.replace(/\{\{([\w\-\.]+)}}/gi,function(t,e){return o.helper.namespace.call(o,e,i,"get","")}):o.helper.namespace.call(o,i.matchedKey,i).toString(),o.focusOnly=!0,o.node.val(o.query).focus(),o.searchResult(!0),o.buildLayout(),o.hideLayout(),o.helper.executeCallback.call(o,o.options.callback.onClickAfter,[o.node,t(this),i,e])))))}),s.on("mouseenter",function(e){o.helper.executeCallback.call(o,o.options.callback.onMouseEnter,[o.node,t(this),i,e])}),s.on("mouseleave",function(e){o.helper.executeCallback.call(o,o.options.callback.onMouseLeave,[o.node,t(this),i,e])})}(b,l,c),(this.groupTemplate?s.find('[data-group-template="'+r+'"] ul'):s).append(c);if(this.result.length&&v.length)for(var b=0,k=v.length;k>b;++b)s.find('[data-group-template="'+v[b]+'"]').remove();this.resultHtml=s}},buildBackdropLayout:function(){this.options.backdrop&&(this.backdrop.container||(this.backdrop.css=t.extend({opacity:.6,filter:"alpha(opacity=60)",position:"fixed",top:0,right:0,bottom:0,left:0,"z-index":1040,"background-color":"#000"},this.options.backdrop),this.backdrop.container=t("<div/>",{"class":this.options.selector.backdrop,css:this.backdrop.css}).insertAfter(this.container)),this.container.addClass("backdrop").css({"z-index":this.backdrop.css["z-index"]+1,position:"relative"}))},buildHintLayout:function(e){if(this.options.hint){if(this.node[0].scrollWidth>Math.ceil(this.node.innerWidth()))return void(this.hint.container&&this.hint.container.val(""));var i=this,o="",e=e||this.result,s=this.query.toLowerCase();if(this.options.accent&&(s=this.helper.removeAccent.call(this,s)),this.hintIndex=null,this.searchGroups.length){if(this.hint.container||(this.hint.css=t.extend({"border-color":"transparent",position:"absolute",top:0,display:"inline","z-index":-1,"float":"none",color:"silver","box-shadow":"none",cursor:"default","-webkit-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none"},this.options.hint),this.hint.container=t("<input/>",{type:this.node.attr("type"),"class":this.node.attr("class"),readonly:!0,unselectable:"on","aria-hidden":"true",tabindex:-1,click:function(){i.node.focus()}}).addClass(this.options.selector.hint).css(this.hint.css).insertAfter(this.node),this.node.parent().css({position:"relative"})),this.hint.container.css("color",this.hint.css.color),s)for(var n,r,a,l=0,h=e.length;h>l;l++){r=e[l].group,n=this.options.source[r].display||this.options.display;for(var c=0,u=n.length;u>c;c++)if(a=String(e[l][n[c]]).toLowerCase(),this.options.accent&&(a=this.helper.removeAccent.call(this,a)),0===a.indexOf(s)){o=String(e[l][n[c]]),this.hintIndex=l;break}if(null!==this.hintIndex)break}this.hint.container.val(o.length>0&&this.rawQuery+o.substring(this.query.length)||"")}}},buildDropdownLayout:function(){if(this.options.dropdownFilter){var e=this;t("<span/>",{"class":this.options.selector.filter,html:function(){t(this).append(t("<button/>",{type:"button","class":e.options.selector.filterButton,style:"display: none;",click:function(i){i.stopPropagation(),e.container.toggleClass("filter");var o=e.namespace+"-dropdown-filter";t("html").off(o),e.container.hasClass("filter")&&t("html").on("click"+o+" touchend"+o,function(i){t(i.target).closest("."+e.options.selector.filter)[0]||e.hasDragged||e.container.removeClass("filter")})}})),t(this).append(t("<ul/>",{"class":e.options.selector.dropdown}))}}).insertAfter(e.container.find("."+e.options.selector.query))}},buildDropdownItemLayout:function(e){function i(t){"*"===t.value?delete this.filters.dropdown:this.filters.dropdown=t,this.container.removeClass("filter").find("."+this.options.selector.filterButton).html(t.template),this.isDropdownEvent=!0,this.node.trigger("search"+this.namespace),this.node.focus()}if(this.options.dropdownFilter){var o,s,n=this,r="string"==typeof this.options.dropdownFilter&&this.options.dropdownFilter||"All",a=this.container.find("."+this.options.selector.dropdown);"static"!==e||this.options.dropdownFilter!==!0&&"string"!=typeof this.options.dropdownFilter||this.dropdownFilter["static"].push({key:"group",template:"{{group}}",all:r,value:Object.keys(this.options.source)});for(var l=0,h=this.dropdownFilter[e].length;h>l;l++){s=this.dropdownFilter[e][l],Array.isArray(s.value)||(s.value=[s.value]),s.all&&(this.dropdownFilterAll=s.all);for(var c=0,u=s.value.length;u>=c;c++)(c!==u||l===h-1)&&(c===u&&l===h-1&&"static"===e&&this.dropdownFilter.dynamic.length||(o=this.dropdownFilterAll||r,s.value[c]?o=s.template?s.template.replace(new RegExp("{{"+s.key+"}}","gi"),s.value[c]):s.value[c]:this.container.find("."+n.options.selector.filterButton).html(o),function(e,o,s){a.append(t("<li/>",{"class":n.options.selector.dropdownItem+" "+n.helper.slugify.call(n,o.key+"-"+(o.value[e]||r)),
html:t("<a/>",{href:"javascript:;",html:s,click:function(t){t.preventDefault(),i.call(n,{key:o.key,value:o.value[e]||"*",template:s})}})}))}(c,s,o)))}this.dropdownFilter[e].length&&this.container.find("."+n.options.selector.filterButton).removeAttr("style")}},dynamicFilter:{isEnabled:!1,init:function(){this.options.dynamicFilter&&(this.dynamicFilter.bind.call(this),this.dynamicFilter.isEnabled=!0)},validate:function(t){var e,i,o=null,s=null;for(var n in this.filters.dynamic)if(this.filters.dynamic.hasOwnProperty(n)&&(i=~n.indexOf(".")?this.helper.namespace.call(this,n,t,"get"):t[n],"|"!==this.filters.dynamic[n].modifier||o||(o=i==this.filters.dynamic[n].value||!1),"&"===this.filters.dynamic[n].modifier)){if(i!=this.filters.dynamic[n].value){s=!1;break}s=!0}return e=o,null!==s&&(e=s,s===!0&&null!==o&&(e=o)),!!e},set:function(t,e){var i=t.match(/^([|&])?(.+)/);e?this.filters.dynamic[i[2]]={modifier:i[1]||"|",value:e}:delete this.filters.dynamic[i[2]],this.dynamicFilter.isEnabled&&this.generateSource()},bind:function(){for(var e,i=this,o=0,s=this.options.dynamicFilter.length;s>o;o++)e=this.options.dynamicFilter[o],"string"==typeof e.selector&&(e.selector=t(e.selector)),e.selector instanceof t&&e.selector[0]&&e.key&&!function(t){t.selector.off(i.namespace).on("change"+i.namespace,function(){i.dynamicFilter.set.apply(i,[t.key,i.dynamicFilter.getValue(this)])}).trigger("change"+i.namespace)}(e)},getValue:function(t){var e;return"SELECT"===t.tagName?e=t.value:"INPUT"===t.tagName&&("checkbox"===t.type?e=t.checked&&t.getAttribute("value")||t.checked||null:"radio"===t.type&&t.checked&&(e=t.value)),e}},showLayout:function(){function e(){var e=this;t("html").off("keydown"+this.namespace).on("keydown"+this.namespace,function(i){i.keyCode&&9===i.keyCode&&setTimeout(function(){t(":focus").closest(e.container).find(e.node)[0]||e.hideLayout()},0)}),t("html").off("click"+this.namespace+" touchend"+this.namespace).on("click"+this.namespace+" touchend"+this.namespace,function(i){t(i.target).closest(e.container)[0]||e.hasDragged||e.hideLayout()})}this.container.hasClass("result")||(this.result.length||this.options.emptyTemplate||this.options.backdropOnFocus)&&(e.call(this),this.container.addClass([this.result.length||this.searchGroups.length&&this.options.emptyTemplate&&this.query.length?"result ":"",this.options.hint&&this.searchGroups.length?"hint":"",this.options.backdrop||this.options.backdropOnFocus?"backdrop":""].join(" ")),this.helper.executeCallback.call(this,this.options.callback.onShowLayout,[this.node,this.query]))},hideLayout:function(){(this.container.hasClass("result")||this.container.hasClass("backdrop"))&&(this.container.removeClass("result hint filter"+(this.options.backdropOnFocus&&t(this.node).is(":focus")?"":" backdrop")),this.options.backdropOnFocus&&this.container.hasClass("backdrop")||(t("html").off(this.namespace),this.helper.executeCallback.call(this,this.options.callback.onHideLayout,[this.node,this.query])))},resetLayout:function(){this.result={},this.groups=[],this.resultCount=0,this.resultCountPerGroup={},this.resultItemCount=0,this.resultHtml=null,this.options.hint&&this.hint.container&&this.hint.container.val("")},resetInput:function(){this.node.val(""),this.item=null,this.query="",this.rawQuery=""},buildCancelButtonLayout:function(){if(this.options.cancelButton){var e=this;t("<span/>",{"class":this.options.selector.cancelButton,mousedown:function(t){t.stopImmediatePropagation(),t.preventDefault(),e.resetInput(),e.node.trigger("input"+e.namespace,[t])}}).insertBefore(this.node)}},toggleCancelButtonVisibility:function(){this.container.toggleClass("cancel",!!this.query.length)},__construct:function(){this.extendOptions(),this.unifySourceFormat()&&(this.dynamicFilter.init.apply(this),this.init(),this.buildDropdownLayout(),this.buildDropdownItemLayout("static"),this.delegateEvents(),this.buildCancelButtonLayout(),this.helper.executeCallback.call(this,this.options.callback.onReady,[this.node]))},helper:{isEmpty:function(t){for(var e in t)if(t.hasOwnProperty(e))return!1;return!0},removeAccent:function(t){if("string"==typeof t){var e=o;return"object"==typeof this.options.accent&&(e=this.options.accent),t=t.toLowerCase().replace(new RegExp("["+e.from+"]","g"),function(t){return e.to[e.from.indexOf(t)]})}},slugify:function(t){return t=String(t),""!==t&&(t=this.helper.removeAccent.call(this,t),t=t.replace(/[^-a-z0-9]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")),t},sort:function(t,e,i){var o=function(e){for(var o=0,s=t.length;s>o;o++)if("undefined"!=typeof e[t[o]])return i(e[t[o]]);return e};return e=[-1,1][+!!e],function(t,i){return t=o(t),i=o(i),e*((t>i)-(i>t))}},replaceAt:function(t,e,i,o){return t.substring(0,e)+o+t.substring(e+i)},highlight:function(t,e,i){t=String(t);var o=i&&this.helper.removeAccent.call(this,t)||t,s=[];Array.isArray(e)||(e=[e]),e.sort(function(t,e){return e.length-t.length});for(var n=e.length-1;n>=0;n--)""!==e[n].trim()?e[n]=e[n].replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&"):e.splice(n,1);o.replace(new RegExp("(?:"+e.join("|")+")(?!([^<]+)?>)","gi"),function(t,e,i){s.push({offset:i,length:t.length})});for(var n=s.length-1;n>=0;n--)t=this.helper.replaceAt(t,s[n].offset,s[n].length,"<strong>"+t.substr(s[n].offset,s[n].length)+"</strong>");return t},getCaret:function(t){if(t.selectionStart)return t.selectionStart;if(document.selection){t.focus();var e=document.selection.createRange();if(null===e)return 0;var i=t.createTextRange(),o=i.duplicate();return i.moveToBookmark(e.getBookmark()),o.setEndPoint("EndToStart",i),o.text.length}return 0},cleanStringFromScript:function(t){return"string"==typeof t&&t.replace(/<\/?(?:script|iframe)\b[^>]*>/gm,"")||t},executeCallback:function(t,e){if(t){var i;if("function"==typeof t)i=t;else if(("string"==typeof t||Array.isArray(t))&&("string"==typeof t&&(t=[t,[]]),i=this.helper.namespace.call(this,t[0],window),"function"!=typeof i))return;return i.apply(this,(t[1]||[]).concat(e?e:[]))}},namespace:function(t,e,i,o){if("string"!=typeof t||""===t)return!1;var s="undefined"!=typeof o?o:void 0;if(!~t.indexOf("."))return e[t]||s;for(var n=t.split("."),r=e||window,i=i||"get",a="",l=0,h=n.length;h>l;l++){if(a=n[l],"undefined"==typeof r[a]){if(~["get","delete"].indexOf(i))return"undefined"!=typeof o?o:void 0;r[a]={}}if(~["set","create","delete"].indexOf(i)&&l===h-1){if("set"!==i&&"create"!==i)return delete r[a],!0;r[a]=s}r=r[a]}return r},typeWatch:function(){var t=0;return function(e,i){clearTimeout(t),t=setTimeout(e,i)}}()}},t.fn.typeahead=t.typeahead=function(t){return l.typeahead(this,t)};var l={typeahead:function(e,i){if(i&&i.source&&"object"==typeof i.source){if("function"==typeof e){if(!i.input)return;e=t(i.input)}if(e.length&&"INPUT"===e[0].nodeName){if(1===e.length)return e[0].selector=e.selector||i.input||e[0].nodeName.toLowerCase(),window.Typeahead[e[0].selector]=new a(e,i);for(var o,s={},n=0,r=e.length;r>n;++n)o=e[n].nodeName.toLowerCase(),"undefined"!=typeof s[o]&&(o+=n),e[n].selector=o,window.Typeahead[o]=s[o]=new a(e.eq(n),i);return s}}}};return window.console=window.console||{log:function(){}},Array.isArray||(Array.isArray=function(t){return"[object Array]"===Object.prototype.toString.call(t)}),"trim"in String.prototype||(String.prototype.trim=function(){return this.replace(/^\s+/,"").replace(/\s+$/,"")}),"indexOf"in Array.prototype||(Array.prototype.indexOf=function(t,e){void 0===e&&(e=0),0>e&&(e+=this.length),0>e&&(e=0);for(var i=this.length;i>e;e++)if(e in this&&this[e]===t)return e;return-1}),Object.keys||(Object.keys=function(t){var e,i=[];for(e in t)Object.prototype.hasOwnProperty.call(t,e)&&i.push(e);return i}),a});
/*! jQuery Validation Plugin - v1.16.0 - 12/2/2016
 * http://jqueryvalidation.org/
 * Copyright (c) 2016 Jörn Zaefferer; Licensed MIT */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof module&&module.exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){a.extend(a.fn,{validate:function(b){if(!this.length)return void(b&&b.debug&&window.console&&console.warn("Nothing selected, can't validate, returning nothing."));var c=a.data(this[0],"validator");return c?c:(this.attr("novalidate","novalidate"),c=new a.validator(b,this[0]),a.data(this[0],"validator",c),c.settings.onsubmit&&(this.on("click.validate",":submit",function(b){c.settings.submitHandler&&(c.submitButton=b.target),a(this).hasClass("cancel")&&(c.cancelSubmit=!0),void 0!==a(this).attr("formnovalidate")&&(c.cancelSubmit=!0)}),this.on("submit.validate",function(b){function d(){var d,e;return!c.settings.submitHandler||(c.submitButton&&(d=a("<input type='hidden'/>").attr("name",c.submitButton.name).val(a(c.submitButton).val()).appendTo(c.currentForm)),e=c.settings.submitHandler.call(c,c.currentForm,b),c.submitButton&&d.remove(),void 0!==e&&e)}return c.settings.debug&&b.preventDefault(),c.cancelSubmit?(c.cancelSubmit=!1,d()):c.form()?c.pendingRequest?(c.formSubmitted=!0,!1):d():(c.focusInvalid(),!1)})),c)},valid:function(){var b,c,d;return a(this[0]).is("form")?b=this.validate().form():(d=[],b=!0,c=a(this[0].form).validate(),this.each(function(){b=c.element(this)&&b,b||(d=d.concat(c.errorList))}),c.errorList=d),b},rules:function(b,c){var d,e,f,g,h,i,j=this[0];if(null!=j&&null!=j.form){if(b)switch(d=a.data(j.form,"validator").settings,e=d.rules,f=a.validator.staticRules(j),b){case"add":a.extend(f,a.validator.normalizeRule(c)),delete f.messages,e[j.name]=f,c.messages&&(d.messages[j.name]=a.extend(d.messages[j.name],c.messages));break;case"remove":return c?(i={},a.each(c.split(/\s/),function(b,c){i[c]=f[c],delete f[c],"required"===c&&a(j).removeAttr("aria-required")}),i):(delete e[j.name],f)}return g=a.validator.normalizeRules(a.extend({},a.validator.classRules(j),a.validator.attributeRules(j),a.validator.dataRules(j),a.validator.staticRules(j)),j),g.required&&(h=g.required,delete g.required,g=a.extend({required:h},g),a(j).attr("aria-required","true")),g.remote&&(h=g.remote,delete g.remote,g=a.extend(g,{remote:h})),g}}}),a.extend(a.expr.pseudos||a.expr[":"],{blank:function(b){return!a.trim(""+a(b).val())},filled:function(b){var c=a(b).val();return null!==c&&!!a.trim(""+c)},unchecked:function(b){return!a(b).prop("checked")}}),a.validator=function(b,c){this.settings=a.extend(!0,{},a.validator.defaults,b),this.currentForm=c,this.init()},a.validator.format=function(b,c){return 1===arguments.length?function(){var c=a.makeArray(arguments);return c.unshift(b),a.validator.format.apply(this,c)}:void 0===c?b:(arguments.length>2&&c.constructor!==Array&&(c=a.makeArray(arguments).slice(1)),c.constructor!==Array&&(c=[c]),a.each(c,function(a,c){b=b.replace(new RegExp("\\{"+a+"\\}","g"),function(){return c})}),b)},a.extend(a.validator,{defaults:{messages:{},groups:{},rules:{},errorClass:"error",pendingClass:"pending",validClass:"valid",errorElement:"label",focusCleanup:!1,focusInvalid:!0,errorContainer:a([]),errorLabelContainer:a([]),onsubmit:!0,ignore:":hidden",ignoreTitle:!1,onfocusin:function(a){this.lastActive=a,this.settings.focusCleanup&&(this.settings.unhighlight&&this.settings.unhighlight.call(this,a,this.settings.errorClass,this.settings.validClass),this.hideThese(this.errorsFor(a)))},onfocusout:function(a){this.checkable(a)||!(a.name in this.submitted)&&this.optional(a)||this.element(a)},onkeyup:function(b,c){var d=[16,17,18,20,35,36,37,38,39,40,45,144,225];9===c.which&&""===this.elementValue(b)||a.inArray(c.keyCode,d)!==-1||(b.name in this.submitted||b.name in this.invalid)&&this.element(b)},onclick:function(a){a.name in this.submitted?this.element(a):a.parentNode.name in this.submitted&&this.element(a.parentNode)},highlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).addClass(c).removeClass(d):a(b).addClass(c).removeClass(d)},unhighlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).removeClass(c).addClass(d):a(b).removeClass(c).addClass(d)}},setDefaults:function(b){a.extend(a.validator.defaults,b)},messages:{required:"This field is required.",remote:"Please fix this field.",email:"Please enter a valid email address.",url:"Please enter a valid URL.",date:"Please enter a valid date.",dateISO:"Please enter a valid date (ISO).",number:"Please enter a valid number.",digits:"Please enter only digits.",equalTo:"Please enter the same value again.",maxlength:a.validator.format("Please enter no more than {0} characters."),minlength:a.validator.format("Please enter at least {0} characters."),rangelength:a.validator.format("Please enter a value between {0} and {1} characters long."),range:a.validator.format("Please enter a value between {0} and {1}."),max:a.validator.format("Please enter a value less than or equal to {0}."),min:a.validator.format("Please enter a value greater than or equal to {0}."),step:a.validator.format("Please enter a multiple of {0}.")},autoCreateRanges:!1,prototype:{init:function(){function b(b){!this.form&&this.hasAttribute("contenteditable")&&(this.form=a(this).closest("form")[0]);var c=a.data(this.form,"validator"),d="on"+b.type.replace(/^validate/,""),e=c.settings;e[d]&&!a(this).is(e.ignore)&&e[d].call(c,this,b)}this.labelContainer=a(this.settings.errorLabelContainer),this.errorContext=this.labelContainer.length&&this.labelContainer||a(this.currentForm),this.containers=a(this.settings.errorContainer).add(this.settings.errorLabelContainer),this.submitted={},this.valueCache={},this.pendingRequest=0,this.pending={},this.invalid={},this.reset();var c,d=this.groups={};a.each(this.settings.groups,function(b,c){"string"==typeof c&&(c=c.split(/\s/)),a.each(c,function(a,c){d[c]=b})}),c=this.settings.rules,a.each(c,function(b,d){c[b]=a.validator.normalizeRule(d)}),a(this.currentForm).on("focusin.validate focusout.validate keyup.validate",":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], [type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], [type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], [type='radio'], [type='checkbox'], [contenteditable], [type='button']",b).on("click.validate","select, option, [type='radio'], [type='checkbox']",b),this.settings.invalidHandler&&a(this.currentForm).on("invalid-form.validate",this.settings.invalidHandler),a(this.currentForm).find("[required], [data-rule-required], .required").attr("aria-required","true")},form:function(){return this.checkForm(),a.extend(this.submitted,this.errorMap),this.invalid=a.extend({},this.errorMap),this.valid()||a(this.currentForm).triggerHandler("invalid-form",[this]),this.showErrors(),this.valid()},checkForm:function(){this.prepareForm();for(var a=0,b=this.currentElements=this.elements();b[a];a++)this.check(b[a]);return this.valid()},element:function(b){var c,d,e=this.clean(b),f=this.validationTargetFor(e),g=this,h=!0;return void 0===f?delete this.invalid[e.name]:(this.prepareElement(f),this.currentElements=a(f),d=this.groups[f.name],d&&a.each(this.groups,function(a,b){b===d&&a!==f.name&&(e=g.validationTargetFor(g.clean(g.findByName(a))),e&&e.name in g.invalid&&(g.currentElements.push(e),h=g.check(e)&&h))}),c=this.check(f)!==!1,h=h&&c,c?this.invalid[f.name]=!1:this.invalid[f.name]=!0,this.numberOfInvalids()||(this.toHide=this.toHide.add(this.containers)),this.showErrors(),a(b).attr("aria-invalid",!c)),h},showErrors:function(b){if(b){var c=this;a.extend(this.errorMap,b),this.errorList=a.map(this.errorMap,function(a,b){return{message:a,element:c.findByName(b)[0]}}),this.successList=a.grep(this.successList,function(a){return!(a.name in b)})}this.settings.showErrors?this.settings.showErrors.call(this,this.errorMap,this.errorList):this.defaultShowErrors()},resetForm:function(){a.fn.resetForm&&a(this.currentForm).resetForm(),this.invalid={},this.submitted={},this.prepareForm(),this.hideErrors();var b=this.elements().removeData("previousValue").removeAttr("aria-invalid");this.resetElements(b)},resetElements:function(a){var b;if(this.settings.unhighlight)for(b=0;a[b];b++)this.settings.unhighlight.call(this,a[b],this.settings.errorClass,""),this.findByName(a[b].name).removeClass(this.settings.validClass);else a.removeClass(this.settings.errorClass).removeClass(this.settings.validClass)},numberOfInvalids:function(){return this.objectLength(this.invalid)},objectLength:function(a){var b,c=0;for(b in a)a[b]&&c++;return c},hideErrors:function(){this.hideThese(this.toHide)},hideThese:function(a){a.not(this.containers).text(""),this.addWrapper(a).hide()},valid:function(){return 0===this.size()},size:function(){return this.errorList.length},focusInvalid:function(){if(this.settings.focusInvalid)try{a(this.findLastActive()||this.errorList.length&&this.errorList[0].element||[]).filter(":visible").focus().trigger("focusin")}catch(b){}},findLastActive:function(){var b=this.lastActive;return b&&1===a.grep(this.errorList,function(a){return a.element.name===b.name}).length&&b},elements:function(){var b=this,c={};return a(this.currentForm).find("input, select, textarea, [contenteditable]").not(":submit, :reset, :image, :disabled").not(this.settings.ignore).filter(function(){var d=this.name||a(this).attr("name");return!d&&b.settings.debug&&window.console&&console.error("%o has no name assigned",this),this.hasAttribute("contenteditable")&&(this.form=a(this).closest("form")[0]),!(d in c||!b.objectLength(a(this).rules()))&&(c[d]=!0,!0)})},clean:function(b){return a(b)[0]},errors:function(){var b=this.settings.errorClass.split(" ").join(".");return a(this.settings.errorElement+"."+b,this.errorContext)},resetInternals:function(){this.successList=[],this.errorList=[],this.errorMap={},this.toShow=a([]),this.toHide=a([])},reset:function(){this.resetInternals(),this.currentElements=a([])},prepareForm:function(){this.reset(),this.toHide=this.errors().add(this.containers)},prepareElement:function(a){this.reset(),this.toHide=this.errorsFor(a)},elementValue:function(b){var c,d,e=a(b),f=b.type;return"radio"===f||"checkbox"===f?this.findByName(b.name).filter(":checked").val():"number"===f&&"undefined"!=typeof b.validity?b.validity.badInput?"NaN":e.val():(c=b.hasAttribute("contenteditable")?e.text():e.val(),"file"===f?"C:\\fakepath\\"===c.substr(0,12)?c.substr(12):(d=c.lastIndexOf("/"),d>=0?c.substr(d+1):(d=c.lastIndexOf("\\"),d>=0?c.substr(d+1):c)):"string"==typeof c?c.replace(/\r/g,""):c)},check:function(b){b=this.validationTargetFor(this.clean(b));var c,d,e,f=a(b).rules(),g=a.map(f,function(a,b){return b}).length,h=!1,i=this.elementValue(b);if("function"==typeof f.normalizer){if(i=f.normalizer.call(b,i),"string"!=typeof i)throw new TypeError("The normalizer should return a string value.");delete f.normalizer}for(d in f){e={method:d,parameters:f[d]};try{if(c=a.validator.methods[d].call(this,i,b,e.parameters),"dependency-mismatch"===c&&1===g){h=!0;continue}if(h=!1,"pending"===c)return void(this.toHide=this.toHide.not(this.errorsFor(b)));if(!c)return this.formatAndAdd(b,e),!1}catch(j){throw this.settings.debug&&window.console&&console.log("Exception occurred when checking element "+b.id+", check the '"+e.method+"' method.",j),j instanceof TypeError&&(j.message+=".  Exception occurred when checking element "+b.id+", check the '"+e.method+"' method."),j}}if(!h)return this.objectLength(f)&&this.successList.push(b),!0},customDataMessage:function(b,c){return a(b).data("msg"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase())||a(b).data("msg")},customMessage:function(a,b){var c=this.settings.messages[a];return c&&(c.constructor===String?c:c[b])},findDefined:function(){for(var a=0;a<arguments.length;a++)if(void 0!==arguments[a])return arguments[a]},defaultMessage:function(b,c){"string"==typeof c&&(c={method:c});var d=this.findDefined(this.customMessage(b.name,c.method),this.customDataMessage(b,c.method),!this.settings.ignoreTitle&&b.title||void 0,a.validator.messages[c.method],"<strong>Warning: No message defined for "+b.name+"</strong>"),e=/\$?\{(\d+)\}/g;return"function"==typeof d?d=d.call(this,c.parameters,b):e.test(d)&&(d=a.validator.format(d.replace(e,"{$1}"),c.parameters)),d},formatAndAdd:function(a,b){var c=this.defaultMessage(a,b);this.errorList.push({message:c,element:a,method:b.method}),this.errorMap[a.name]=c,this.submitted[a.name]=c},addWrapper:function(a){return this.settings.wrapper&&(a=a.add(a.parent(this.settings.wrapper))),a},defaultShowErrors:function(){var a,b,c;for(a=0;this.errorList[a];a++)c=this.errorList[a],this.settings.highlight&&this.settings.highlight.call(this,c.element,this.settings.errorClass,this.settings.validClass),this.showLabel(c.element,c.message);if(this.errorList.length&&(this.toShow=this.toShow.add(this.containers)),this.settings.success)for(a=0;this.successList[a];a++)this.showLabel(this.successList[a]);if(this.settings.unhighlight)for(a=0,b=this.validElements();b[a];a++)this.settings.unhighlight.call(this,b[a],this.settings.errorClass,this.settings.validClass);this.toHide=this.toHide.not(this.toShow),this.hideErrors(),this.addWrapper(this.toShow).show()},validElements:function(){return this.currentElements.not(this.invalidElements())},invalidElements:function(){return a(this.errorList).map(function(){return this.element})},showLabel:function(b,c){var d,e,f,g,h=this.errorsFor(b),i=this.idOrName(b),j=a(b).attr("aria-describedby");h.length?(h.removeClass(this.settings.validClass).addClass(this.settings.errorClass),h.html(c)):(h=a("<"+this.settings.errorElement+">").attr("id",i+"-error").addClass(this.settings.errorClass).html(c||""),d=h,this.settings.wrapper&&(d=h.hide().show().wrap("<"+this.settings.wrapper+"/>").parent()),this.labelContainer.length?this.labelContainer.append(d):this.settings.errorPlacement?this.settings.errorPlacement.call(this,d,a(b)):d.insertAfter(b),h.is("label")?h.attr("for",i):0===h.parents("label[for='"+this.escapeCssMeta(i)+"']").length&&(f=h.attr("id"),j?j.match(new RegExp("\\b"+this.escapeCssMeta(f)+"\\b"))||(j+=" "+f):j=f,a(b).attr("aria-describedby",j),e=this.groups[b.name],e&&(g=this,a.each(g.groups,function(b,c){c===e&&a("[name='"+g.escapeCssMeta(b)+"']",g.currentForm).attr("aria-describedby",h.attr("id"))})))),!c&&this.settings.success&&(h.text(""),"string"==typeof this.settings.success?h.addClass(this.settings.success):this.settings.success(h,b)),this.toShow=this.toShow.add(h)},errorsFor:function(b){var c=this.escapeCssMeta(this.idOrName(b)),d=a(b).attr("aria-describedby"),e="label[for='"+c+"'], label[for='"+c+"'] *";return d&&(e=e+", #"+this.escapeCssMeta(d).replace(/\s+/g,", #")),this.errors().filter(e)},escapeCssMeta:function(a){return a.replace(/([\\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g,"\\$1")},idOrName:function(a){return this.groups[a.name]||(this.checkable(a)?a.name:a.id||a.name)},validationTargetFor:function(b){return this.checkable(b)&&(b=this.findByName(b.name)),a(b).not(this.settings.ignore)[0]},checkable:function(a){return/radio|checkbox/i.test(a.type)},findByName:function(b){return a(this.currentForm).find("[name='"+this.escapeCssMeta(b)+"']")},getLength:function(b,c){switch(c.nodeName.toLowerCase()){case"select":return a("option:selected",c).length;case"input":if(this.checkable(c))return this.findByName(c.name).filter(":checked").length}return b.length},depend:function(a,b){return!this.dependTypes[typeof a]||this.dependTypes[typeof a](a,b)},dependTypes:{"boolean":function(a){return a},string:function(b,c){return!!a(b,c.form).length},"function":function(a,b){return a(b)}},optional:function(b){var c=this.elementValue(b);return!a.validator.methods.required.call(this,c,b)&&"dependency-mismatch"},startRequest:function(b){this.pending[b.name]||(this.pendingRequest++,a(b).addClass(this.settings.pendingClass),this.pending[b.name]=!0)},stopRequest:function(b,c){this.pendingRequest--,this.pendingRequest<0&&(this.pendingRequest=0),delete this.pending[b.name],a(b).removeClass(this.settings.pendingClass),c&&0===this.pendingRequest&&this.formSubmitted&&this.form()?(a(this.currentForm).submit(),this.formSubmitted=!1):!c&&0===this.pendingRequest&&this.formSubmitted&&(a(this.currentForm).triggerHandler("invalid-form",[this]),this.formSubmitted=!1)},previousValue:function(b,c){return c="string"==typeof c&&c||"remote",a.data(b,"previousValue")||a.data(b,"previousValue",{old:null,valid:!0,message:this.defaultMessage(b,{method:c})})},destroy:function(){this.resetForm(),a(this.currentForm).off(".validate").removeData("validator").find(".validate-equalTo-blur").off(".validate-equalTo").removeClass("validate-equalTo-blur")}},classRuleSettings:{required:{required:!0},email:{email:!0},url:{url:!0},date:{date:!0},dateISO:{dateISO:!0},number:{number:!0},digits:{digits:!0},creditcard:{creditcard:!0}},addClassRules:function(b,c){b.constructor===String?this.classRuleSettings[b]=c:a.extend(this.classRuleSettings,b)},classRules:function(b){var c={},d=a(b).attr("class");return d&&a.each(d.split(" "),function(){this in a.validator.classRuleSettings&&a.extend(c,a.validator.classRuleSettings[this])}),c},normalizeAttributeRule:function(a,b,c,d){/min|max|step/.test(c)&&(null===b||/number|range|text/.test(b))&&(d=Number(d),isNaN(d)&&(d=void 0)),d||0===d?a[c]=d:b===c&&"range"!==b&&(a[c]=!0)},attributeRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)"required"===c?(d=b.getAttribute(c),""===d&&(d=!0),d=!!d):d=f.attr(c),this.normalizeAttributeRule(e,g,c,d);return e.maxlength&&/-1|2147483647|524288/.test(e.maxlength)&&delete e.maxlength,e},dataRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)d=f.data("rule"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase()),this.normalizeAttributeRule(e,g,c,d);return e},staticRules:function(b){var c={},d=a.data(b.form,"validator");return d.settings.rules&&(c=a.validator.normalizeRule(d.settings.rules[b.name])||{}),c},normalizeRules:function(b,c){return a.each(b,function(d,e){if(e===!1)return void delete b[d];if(e.param||e.depends){var f=!0;switch(typeof e.depends){case"string":f=!!a(e.depends,c.form).length;break;case"function":f=e.depends.call(c,c)}f?b[d]=void 0===e.param||e.param:(a.data(c.form,"validator").resetElements(a(c)),delete b[d])}}),a.each(b,function(d,e){b[d]=a.isFunction(e)&&"normalizer"!==d?e(c):e}),a.each(["minlength","maxlength"],function(){b[this]&&(b[this]=Number(b[this]))}),a.each(["rangelength","range"],function(){var c;b[this]&&(a.isArray(b[this])?b[this]=[Number(b[this][0]),Number(b[this][1])]:"string"==typeof b[this]&&(c=b[this].replace(/[\[\]]/g,"").split(/[\s,]+/),b[this]=[Number(c[0]),Number(c[1])]))}),a.validator.autoCreateRanges&&(null!=b.min&&null!=b.max&&(b.range=[b.min,b.max],delete b.min,delete b.max),null!=b.minlength&&null!=b.maxlength&&(b.rangelength=[b.minlength,b.maxlength],delete b.minlength,delete b.maxlength)),b},normalizeRule:function(b){if("string"==typeof b){var c={};a.each(b.split(/\s/),function(){c[this]=!0}),b=c}return b},addMethod:function(b,c,d){a.validator.methods[b]=c,a.validator.messages[b]=void 0!==d?d:a.validator.messages[b],c.length<3&&a.validator.addClassRules(b,a.validator.normalizeRule(b))},methods:{required:function(b,c,d){if(!this.depend(d,c))return"dependency-mismatch";if("select"===c.nodeName.toLowerCase()){var e=a(c).val();return e&&e.length>0}return this.checkable(c)?this.getLength(b,c)>0:b.length>0},email:function(a,b){return this.optional(b)||/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(a)},url:function(a,b){return this.optional(b)||/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(a)},date:function(a,b){return this.optional(b)||!/Invalid|NaN/.test(new Date(a).toString())},dateISO:function(a,b){return this.optional(b)||/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(a)},number:function(a,b){return this.optional(b)||/^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(a)},digits:function(a,b){return this.optional(b)||/^\d+$/.test(a)},minlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d},maxlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e<=d},rangelength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d[0]&&e<=d[1]},min:function(a,b,c){return this.optional(b)||a>=c},max:function(a,b,c){return this.optional(b)||a<=c},range:function(a,b,c){return this.optional(b)||a>=c[0]&&a<=c[1]},step:function(b,c,d){var e,f=a(c).attr("type"),g="Step attribute on input type "+f+" is not supported.",h=["text","number","range"],i=new RegExp("\\b"+f+"\\b"),j=f&&!i.test(h.join()),k=function(a){var b=(""+a).match(/(?:\.(\d+))?$/);return b&&b[1]?b[1].length:0},l=function(a){return Math.round(a*Math.pow(10,e))},m=!0;if(j)throw new Error(g);return e=k(d),(k(b)>e||l(b)%l(d)!==0)&&(m=!1),this.optional(c)||m},equalTo:function(b,c,d){var e=a(d);return this.settings.onfocusout&&e.not(".validate-equalTo-blur").length&&e.addClass("validate-equalTo-blur").on("blur.validate-equalTo",function(){a(c).valid()}),b===e.val()},remote:function(b,c,d,e){if(this.optional(c))return"dependency-mismatch";e="string"==typeof e&&e||"remote";var f,g,h,i=this.previousValue(c,e);return this.settings.messages[c.name]||(this.settings.messages[c.name]={}),i.originalMessage=i.originalMessage||this.settings.messages[c.name][e],this.settings.messages[c.name][e]=i.message,d="string"==typeof d&&{url:d}||d,h=a.param(a.extend({data:b},d.data)),i.old===h?i.valid:(i.old=h,f=this,this.startRequest(c),g={},g[c.name]=b,a.ajax(a.extend(!0,{mode:"abort",port:"validate"+c.name,dataType:"json",data:g,context:f.currentForm,success:function(a){var d,g,h,j=a===!0||"true"===a;f.settings.messages[c.name][e]=i.originalMessage,j?(h=f.formSubmitted,f.resetInternals(),f.toHide=f.errorsFor(c),f.formSubmitted=h,f.successList.push(c),f.invalid[c.name]=!1,f.showErrors()):(d={},g=a||f.defaultMessage(c,{method:e,parameters:b}),d[c.name]=i.message=g,f.invalid[c.name]=!0,f.showErrors(d)),i.valid=j,f.stopRequest(c,j)}},d)),"pending")}}});var b,c={};return a.ajaxPrefilter?a.ajaxPrefilter(function(a,b,d){var e=a.port;"abort"===a.mode&&(c[e]&&c[e].abort(),c[e]=d)}):(b=a.ajax,a.ajax=function(d){var e=("mode"in d?d:a.ajaxSettings).mode,f=("port"in d?d:a.ajaxSettings).port;return"abort"===e?(c[f]&&c[f].abort(),c[f]=b.apply(this,arguments),c[f]):b.apply(this,arguments)}),a});
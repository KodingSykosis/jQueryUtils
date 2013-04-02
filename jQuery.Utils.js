String.prototype.format = function () {
    var results = this.toString(),
        re;

    if (typeof arguments[0] == 'object') {
        for (var prop in arguments[0]) {
            re = new RegExp('{' + prop + '(?:\!([^\}]+)|\:([^\}]+))?}', 'g');
            var val = arguments[0][prop];
            if (typeof val != 'undefined' || val != null) {
                if (typeof val == 'object') val = $.param(val);
                results = results.replace(re, '$1' + val + '$2');
            }
        }

        results = results.replace(/{[^}]*}/g, '');
    } else {
        for (var i = 0, len = arguments.length; i < len; i++) {
            re = new RegExp('{' + i + '(?:\!([^\}]+)|\:([^\}]+))?}', 'g');
            results = results.replace(re, '$1' + arguments[i] + '$2');
        }
    }

    return results;
};

(function ($) {
    var uuid = 0,
        fnId = 0,
        widgetName = 'jQuery.Utils',
        baseUrl;
    
    $.valHooks.input = {
        get: function (element) {
            var $el = $(element);

            if ($el.data('mask') && $el.data('mask').unmask_re) {
                var re = new RegExp($el.data('mask').unmask_re);
                return element.value.replace(re, '');
            }

            return element.value;
        }
    };
    
    $.extend({
        DEFAULT_DATE_FORMAT: "MM/dd/yyyy",
        ccic: {},
        date: function (val, format) {
            var d = val && val !== '' ? new Date(val) : new Date();
            return $.format.date(d, format || $.DEFAULT_DATE_FORMAT);
        },
        resize: function (fn) {
            var id = fnId++;
            $(window).resize(function () {
                $.debug('debug', 'Window Resized');
                $.sFork('window-resize-' + id, fn);
            });
        },
        fork: function (fn, delay) {
            return function () { return setTimeout(fn, delay || 150); };
        },
        sFork: function (key, fn, delay) {
            var cache = (window.sFork || (window.sFork = {}));
            $.unFork(key);

            if (!cache[key])
                cache[key] = $.fork(fn, delay)();
        },
        unFork: function (key) {
            var cache = (window.sFork || (window.sFork = {}));

            if (cache[key]) {
                clearTimeout(cache[key]);
                cache[key] = undefined;
            }
        },
        debugMode: 'info',
        debugErrorThrowsException: true,
        debug: function () {
            var args = arguments;

            if (typeof args[0] == 'string') {
                switch (args[0].toLowerCase()) {
                    case 'error':
                        if ($.debugErrorThrowsException) {
                            $.error(args[1]);
                        }

                        if ($.debugMode == 'none') return;
                        break;
                    case 'warning':
                        if ($.debugMode == 'error') return;
                        break;
                    case 'info':
                        if ($.debugMode == 'warning') return;
                        break;
                    case 'debug':
                        if ($.debugMode == 'info') return;
                        break;
                }
            }

            switch ($.debugMode.toLowerCase()) {
                case 'error':
                case 'warning':
                case 'info':
                case 'debug':
                    break;
                default:
                    return;
            }

            if (typeof console == 'undefined') return;
            if (console && console.log && Function.prototype.bind) {
                var log = Function.prototype.bind.call(console.log, console);
                log.apply(console, arguments);
            } else if (console && console.log && $.browser.msie && $.browser.version == '8.0') {
                Function.prototype.call.call(console.log, console, '---------------------------');
                var buffer = '';

                for (var i = 0, len = arguments.length; i < len; i++) {
                    if (typeof arguments[i] === 'string') {
                        if (buffer.length > 0) buffer += ', ';
                        buffer += arguments[i];
                    } else {
                        //flush buffer
                        if (buffer.length > 0) {
                            Function.prototype.call.call(console.log, console, buffer);
                            buffer = '';
                        }

                        Function.prototype.call.call(console.log, console, arguments[i]);
                    }
                }

                if (buffer.length > 0) {
                    Function.prototype.call.call(console.log, console, buffer);
                }
            }
        },
        unParam: function (str) {
            str = str.replace(/^\?|\/$/g, '');

            var ary = str.split('&');
            var obj = {};

            for (var i = 0, len = ary.length; i < len; i++) {
                var tokens = ary[i].split('=');
                if (typeof obj[tokens[0]] != 'undefined') {
                    if (!obj[tokens[0]].splice) {
                        obj[tokens[0]] = [obj[tokens[0]]];
                    }

                    obj[tokens[0]].push(tokens[1]);
                } else {
                    obj[tokens[0]] = tokens[1];
                }
            }

            return obj;
        },
        baseUrl: function (value) {
            if (value) {
                baseUrl = value;
            }

            if (!baseUrl) {
                baseUrl = /^\/[^\/]+\/?/.exec(window.location.pathname);
                if (!/\/$/.test(baseUrl)) {
                    baseUrl += '/';
                }
            }

            return baseUrl;
        },
        absolutePath: function (relativePath) {
            var re = /^([hf]t?tps?:\/\/)/;
            var baseUrl = $.baseUrl();

            if (re.test(relativePath)) return relativePath;
            if (/^\//.test(relativePath)) baseUrl = '/';
            return window.location.protocol + '//' + window.location.host + baseUrl + relativePath.replace(/^\/|\.\//, '');
        },
        mvcUrl: function (mvc) {
            return "{protocol:://}{server:/}{app:/}{controller:/}{action:/}{id:/}{query!?}".format(mvc);
        },
        buildUrl: function (mvc) {
            var str = "";
            if (mvc.protocol != null)
                str += mvc.protocol + "://";
            if (mvc.server != null)
                str += mvc.server + "/";
            if (mvc.protocol == null && mvc.server == null)
                str += "/";
            if (mvc.app != null)
                str += mvc.app + "/";
            if (mvc.controller != null)
                str += mvc.controller + "/";
            if (mvc.action != null)
                str += mvc.action + "/";
            if (mvc.id != null)
                str += mvc.id + "/";
            if (mvc.query != null) {
                str += '?' + $.param(mvc.query);
            }

            return str.length < 3
                ? str
                : str.substring(0, str.length - 1);
        },
        mvc: function (url, obj) {
            if (typeof url != 'string') {
                obj = url;
                url = undefined;
            }

            var query = /\?(.*)$/.exec(url || window.location.search) || '';
            var match = $.match('([^\/]+)', $.absolutePath(url || window.location.pathname));
            var mvc = {
                protocol: match.length > 0 ? match[0].replace(':', '') : undefined,
                server: match.length > 1 ? match[1] : undefined,
                app: match.length > 2 ? match[2] : undefined,
                controller: match.length > 3 ? match[3] : undefined,
                action: match.length > 4 ? match[4] : undefined,
                id: match.length > 5 ? match[5] : undefined,
                query: query.length > 1 ? $.unParam(query[1]) : undefined
            };

            return $.extend(mvc, obj || {});
        },
        exec: function (context, str) {
            var fnName = /#?([^(]+)/.exec(str);
            var args = /\(([^(]+)\)/.exec(str);

            if (fnName != null && fnName.length > 1) {
                fnName = fnName[1];
            }

            if (args != null && args.length > 1) {
                args = args[1];
            }

            var fn = context[fnName];

            if (!fn) return -1;
            if (args) {
                args = args.split(/\s?,\s?/);

                for (var i = 0, len = args.length; i < len; i++) {
                    args[i] = eval(args[i]);
                }
            }

            fn.apply(context, args);
        },
        fixJsonObj: function (obj) {
            var re = new RegExp('^/(Date\\([0-9]+\\))/$');
            for (var key in obj) {
                if (typeof obj[key] == 'string') {
                    if (re.test(obj[key])) {
                        var val = re.exec(obj[key]);
                        obj[key] = eval(val[1]);
                        obj[key] = $.format.date(obj[key], $.DEFAULT_DATE_FORMAT);
                    }
                } else if (typeof obj[key] == 'object') {
                    $.fixJsonObj(obj[key]);
                }
            }
        },

        match: function (re, str, reverse) {
            var ary = [],
			    idx = 0,
			    val = '',
                fn = function (s) {
                    if (reverse) {
                        ary.push(
                            s.split('').reverse().join('')
                        );
                    } else {
                        ary.push(s);
                    }
                };

            if (reverse) {
                str = str.split('').reverse().join('');
            }

            re = new RegExp(re);
            while (idx < str.length) {
                val = re.exec(str.substr(idx));

                if (val && val[1].length > 0) {
                    if (val.length > 2) {
                        for (var i = 1; i < val.length; i++) {
                            fn(val[i]);
                        }
                    } else fn(val[1]);

                    idx += val.index + val[0].length;
                } else idx++;
            }

            if (reverse) {
                ary = ary.reverse();
            }

            return ary;
        },

        flatten: function (obj, flat, prefix) {
            if (!flat) flat = {};

            for (var prop in obj) {
                var fullName = (prefix ? prefix + '.' : '') + prop;
                if ($.isPlainObject(obj[prop])) {
                    $.flatten(obj[prop], flat, fullName);
                } else {
                    flat[fullName] = obj[prop];
                }
            }

            return flat;
        },

        cleanMoney: function (val) {
            return parseFloat(val.replace(/\$|,|\s/g, ''));
        },

        //Some UI Stuffs
        intersect: function (point, box) {
            if (!box.right) {
                box.right = box.left + box.width;
            }

            if (!box.bottom) {
                box.bottom = box.top + box.height;
            }

            return point.x >= box.left && point.x <= box.right &&
                point.y >= box.top && point.y <= box.bottom;
        },
        button: function (text, color, icon) {
            var innerDivider, innerIcon, innerIconWrap;
            var innerContent = $('<p>').html(text);

            var innerContentWrap = $('<div>')
                .addClass('button-inner-content')
                .append(innerContent);

            if (icon) {
                innerDivider = $('<div>')
                    .addClass('button-inner-divider');

                innerIcon = $('<img>')
                    .addClass('button-inner-icon')
                    .attr({
                        alt: '',
                        src: $.absolutePath(icon)
                    });

                innerIconWrap = $('<div>')
                    .addClass('button-inner-icon-outer')
                    .append(innerIcon);
            }

            var outer = $('<button>')
                .addClass('button-outer')
                .addClass('button-' + (color || 'green'))
                .append(innerContentWrap);

            if (icon) {
                outer.append(innerIconWrap)
                     .append(innerDivider);
            }

            return outer;
        },
        errorMessage: function (message) {
            var prompt = $('<p>')
                .append(message)
                .css({
                    padding: '15px 0px',
                    width: '100%',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    textAlign: 'center'
                });

            var okayButton =
                $.button('Okay', 'green', 'Content/images/buttons/button-icons/btn-icon-save.png')
                 .click(function () {
                     content.dialog('close');
                 });

            var buttonContainer = $('<div>')
                .addClass(
                    'ui-dialog-buttonpane ' +
                        'ui-widget-content ' +
                            'ui-helper-clearfix'
                )
                .append(
                    $("<div></div>")
                        .addClass("ui-dialog-buttonset")
                        .append(okayButton)
                );

            var content = $('<div>')
                .attr('title', 'Error Message')
                .hide()
                .append(prompt)
                .appendTo('body');

            return content.dialog({
                modal: true,
                width: 380,
                height: 'auto',
                resizable: false,
                draggable: false,
                close: function (event, ui) {
                    var el = $(event.delegateTarget || event.target);
                    el.parents('.ui-dialog').remove();
                    content.remove();
                },
                create: function (event, ui) {
                    var el = $(event.delegateTarget || event.target);
                    var par = el.parents('.ui-dialog');

                    par.append(buttonContainer)
                       .addClass('error-message');
                }
            });
        },

        prompt: function (title, message, yesBtn, noBtn, callback) {
            var yesBtnText = 'Yes',
                noBtnText = 'No';

            var prompt = $('<p>')
                .append(message)
                .css({
                    padding: '15px 0px',
                    width: '100%',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }),
                fn = callback || $.noop;

            if (typeof yesBtn == 'string') {
                yesBtnText = yesBtn;
                yesBtn = null;
            }

            if (typeof noBtn == 'string') {
                noBtnText = noBtn;
                noBtn = null;
            }

            var yesButton = (yesBtn ||
                $.button(yesBtnText || 'Yes', 'green', 'Content/images/buttons/button-icons/btn-icon-save.png'))
                 .click(function () {
                     fn(true);
                     content.dialog('close');
                 });

            var noButton = (noBtn ||
                $.button(noBtnText || 'No', 'gray', 'Content/images/buttons/button-icons/btn-icon-discard.png'))
                 .click(function () {
                     fn(false);
                     content.dialog('close');
                 });

            var buttonContainer = $('<div>')
                .addClass(
                    'ui-dialog-buttonpane ' +
                        'ui-widget-content ' +
                            'ui-helper-clearfix'
                )
                .append(
                    $("<div></div>")
                        .addClass("ui-dialog-buttonset")
                        .append(yesButton)
                        .append(noButton)
                );

            var content = $('<div>')
                .attr('title', title)
                .hide()
                .append(prompt)
                .appendTo('body');

            return content.dialog({
                modal: true,
                width: 380,
                height: 'auto',
                resizable: false,
                draggable: false,
                close: function (event, ui) {
                    var el = $(event.delegateTarget || event.target);
                    el.parents('.ui-dialog').remove();
                    content.remove();
                },
                create: function (event, ui) {
                    var el = $(event.delegateTarget || event.target);
                    var par = el.parents('.ui-dialog');

                    par.append(buttonContainer);
                }
            });
        }
    });

    $.fn.extend({
        uniqueId: function () {
            return this.each(function () {
                if (!this.id) {
                    this.id = "ui-id-" + (++uuid);
                }
            });
        },
        getId: function () {
            return this.attr('id') || this.uniqueId().attr('id');
        },
        reId: function (children) {
            if (children) {
                this.find('[id]').reId();
            }

            return this.each(function () {
                var el = $(this);
                if (el.is('[id]')) {
                    el.removeAttr('id');
                    el.getId();
                }
            });
        },
        intersects: function (point) {
            var pos = this.offset();
            var box = {
                top: pos.top,
                left: pos.left,
                width: this.outerWidth(),
                height: this.outerHeight()
            };

            return $.intersect(point, box);
        },
        disable: function () {
            $.debug('debug', widgetName, 'Disabling element', this.getId());

            this.each(function (idx, el) {
                var $el = $(el);

                if ($el.is('input,select')) {
                    $el.attr('disabled', 'disabled');
                } else {
                    $el.children().disable();
                }
            });
            return this;
        },
        enable: function () {
            $.debug('debug', widgetName, 'Enabling element', this.getId());

            this.each(function (idx, el) {
                var $el = $(el);

                if ($el.is('input,select')) {
                    $el.removeAttr('disabled');
                } else {
                    $el.children().enable();
                }
            });
            return this;
        },
        dateFormat: function (format, defaultValue) {
            this.each(function (idx, el) {
                var $el = $(el),
                    val = $el.val();

                if (val == '') val = defaultValue || new Date();

                $el.val($.date(new Date(val), format || $.DEFAULT_DATE_FORMAT));
            });
            return this;
        },
        
        format: function (format) {
            switch (format) {
                case 'date':
                    this.dateFormat();
                    break;
                case 'money':
                    this.formatCurrency();
                    break;
                case 'number':
                    this.number.apply(this, Array.splice.call(arguments, 1));
                    break;
                default:
                    //this.formatValue.apply(this, arguments);
                    break;
            }

            return this;
        },

        dateVal: function (val, format) {
            this.each(function (idx, el) {
                var $el = $(el),
                    data = val[idx] || val || $el.val();

                if (!$el.is('input')) return;

                try {
                    data = new Date(data);
                } catch (e) {
                    data = new Date();
                }

                $el.val($.date(data, format || $.DEFAULT_DATE_FORMAT));
            });
            return this;
        },

        jSerialize: function () {
            var o = {};
            var a = this.serializeArray();
            $.each(a, function () {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            return o;
        },

        number: function (decimals, commas) {
            return $(this).keypress(function (event) {
                var c = String.fromCharCode(event.which);
                return $.isNumeric(c) || (c == '.' && decimals) || (c == ',' && commas);
            });
        },
        notClicked: function (handler) {
            if (!handler) return;
            var element = this;

            $(window).click(function (event) {
                var target = $(event.target);
                if (!target.is(element) && element.find(target).length == 0) {
                    handler.call(element, $.Event('notClicked', { target: target }));
                }
            });
        },
        totalHeight: function (outer, max) {
            var height = 0;

            if (typeof outer == 'number' && typeof max == 'undefined') {
                max = outer;
                outer = false;
            }

            this.each(function (idx) {
                var el = $(this),
                    pos = el.css('position'),
                    disp = el.css('display'),
                    vis = el.css('visibility'),
                    uncomputed = !el.is(':visible');

                if (typeof max != 'undefined' && idx > max && max != -1 && max != null) {
                    return false;
                }

                if (uncomputed) {
                    el.css({
                        position: 'absolute',
                        display: 'block',
                        visibility: 'hidden'
                    });
                }

                height +=
                    el[outer ? 'outerHeight' : 'height']();

                if (uncomputed) {
                    el.css({
                        position: pos,
                        display: disp,
                        visibility: vis
                    });
                }
            });

            return height == 0 ? null : height;
        }
    });
})(jQuery);
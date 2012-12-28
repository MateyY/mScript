/*! mScript v.1.1.2
 * A JavaScript Library
 * By Matey Yanakiev
 * Released under MIT License
 * See license.txt for details
 */
(function(window,undefined) {
	var document = window.document, //Some shortcuts for window's properties
		old = { //Used for $.cleanUp(); previous value of $ and mScript
			$: window.$,
			mScript: window.mScript
		},
		indexOf = Array.prototype.indexOf, //Native array .indexOf() (if available)
		add = /^\+=/, //Are we appending text or adding new text?
		msPrefix = /\-ms/g, //IE doesn't use camel case on -ms- prefix (from jQuery)
		rtrim = /^[\s\f\t\r\n\x20\uFEFF]+|[\s\f\t\r\n\x20\uFEFF]+$/gm, //Trimming RegExp
		//Used to fetch current month:
		dateMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"],
		//Used to fetch current day:
		dateDays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
		coreTrim = String.prototype.trim, //Core "".trim (if available)
		coreHasOwn = Object.prototype.hasOwnProperty, //.hasOwnProperty()
		mScript = function(element,create) {
			var elements = [],
				type;
			if (element) {
				if (create === true) elements.push(document.createElement(element)); //Add element; this is when we empty our array
				else {
					//$(document.body), $(this), etc. will work; idea from jQuery
					//Also for $(object) and $(function)
					if (element.nodeType || (type = typeof element) === "object" || type === "function") elements.push(element);
					else if (type === "string") elements = mScript.cssSelector(element,create);
				}
			}
			return new $wrap(elements); //Return mScript to enable chaining
		},
		$document, //Reference to $(document) (set below)
		$e, //new mScript.events() (set below)
		detectedAJAX, //Set to $.detectAJAX(true)
		//Check for non-null objects and functions
		objOrFunct = function(obj) {
			var type;
			return obj && ((type = typeof obj) === "object" || type === "function");
		},
		insert = function(type,parent,element) { //Insert elements; note that you cannot insert an element outside the <html> tag
			if (element.nodeType) element = [element]; //$(element) rather than $([element]) is also allowed
			var i = 0,
				len = element.length;
			for (; i < len; i++) type === "before" ? parent[0].parentNode.insertBefore(element[i],parent[0]) : parent[0].nextSibling ? parent[0].parentNode.insertBefore(element[i],parent[0].nextSibling) : (parent[0].parentNode !== document ? parent[0].parentNode : parent[0]).appendChild(element[i]);
		},
		//Match unescaped !important rules
		importantRule = /(?:^!|[^\\]!)[\s\f\t\r\n\x20]*important/,
		addStyle = function(element,prop,val) { //Quick way to add a style to an element
			prop = prop === "float" ? !bugs.css.$float ? "cssFloat" : "styleFloat" : prop;
			var cProp = mScript.toCamelCase(prop),
				style = element.style,
				notDefined;
			if (!style) return; //XML elements
			if ((prop === "width" || prop === "height") && parseFloat(val) < 0) mScript.error("Invalid value: " + val);
			//Important rules have to be added differently; note that some rules are valid, but are not a property of the style object
			//Note the use of a semicolumn before we start; prevents style rules from not being added in IE
			if (importantRule.test(val) || ((notDefined = typeof style[prop] === "undefined") && typeof style[cProp] === "undefined")) style.cssText += ";" + prop + ":" + val + ";";
			else {
				if (!notDefined) style[prop] = val;
				else style[cProp] = val; //For regular rules, use simpler method
			}
		},
		pushSiblings = function(element,arr) { //Push the siblings of an element to a given array
			var parent,node;
			//Doesn't work with falsy values + disconnected nodes
			if (!element || !(parent = element.parentNode)) return arr;
			for (node = parent.firstChild; node; node = node.nextSibling) {
				if (node.nodeType === 1 && node !== element && mScript.indexOf(arr,node) === -1) arr.push(node);
			}
			return arr;
		},
		//For $.memory():
		memory = {},
		memoryInnerAction = /^(?:fire|add|remove)$/,
		toCamelCase = function(str,letter) { //Callback for .replace(), like jQuery's
			return (letter + "").toUpperCase();
		},
		filterOpacity = /alpha\(opacity=([\d\.]+)\)/i, //Match filter: alpha(opactiy=val)
		msFilterOpacity = /\-ms\-filter:[\s\f\t\r\n\x20]*["']?progid:[\s\f\t\r\n\x20]*DXImageTransform\.Microsoft\.Alpha\(Opacity=([\d\.]+)\)["']?;?/i, //Match -ms-filter for opacity
		//Event RegExp:
		rhover = /hover/g, //Hover (globally)
		ractive = /mousedown/g, //Mousedown (globally)
		spaces = /\s/g, //Spaces (globally)
		whitespace = /[\s\f\t\r\n\x20]/gm,
		//For .on() and .end()
		eready = /ready/g,
		removeready = new RegExp("(?:" + whitespace.source + "|,)*ready,?","gm"),
		espaces = /[\s\n\r\t]/g,
		eload = /load/g,
		rTrue = function() {
			return true;
		},
		rFalse = function() {
			return false;
		},
		//Properties for .eventHolder() not to let in
		limitProp = /^(?:type|event|isDefaultPrevented|timeStamp|x|y|target|preventDefault|stop(?:Immediate)?Propagation|isDefaultPrevented|is(?:Immediate)?PropagationStopped)$/,
		removeload = new RegExp("(?:" + whitespace.source + "|,)*load,?","gm"),
		comma = /,/g,
		trailingComma = /,$/, //Trailing comma
		cssUnits = /(?:px|pc|pt|ex|em|mm|cm|in|%)$/, //RegExp to match CSS units
		pxs = /px$/, //Match strings that end with px
		marginRight = /^(?:margin-?[rR]ight)$/,
		getStyle = function(element,prop,type) { //Make a seperate function, so that we can use it on two functions
			var value,body,docElm,computed,isDoc,isWindow;
			if (!element || !element.style && !(isDoc = element.nodeType === 9) && !(isWindow = window == element.window)) return null;
			//Getting the width/height of the document and/or window is a little different
			if (isDoc || isWindow) {
				docElm = document.documentElement;
				body = document.body;
				//We can only get height and width
				if (prop !== "height" && prop !== "width") return null;
				if (isDoc) { //Document
					if (prop === "height") value = mScript.math.max(body.scrollHeight,body.offsetHeight,docElm.clientHeight,docElm.scrollHeight,docElm.offsetHeight);
					else value = mScript.math.min(body.scrollWidth,body.offsetWidth,docElm.clientWidth,docElm.scrollWidth,docElm.offsetWidth);
				} else { //Window
					if (prop === "height") value = window.innerHeight || mScript.math.max(docElm.clientHeight,body.clientHeight);
					else value = window.innerWidth || mScript.math.min(docElm.clientWidth,body.clientWidth);
				}
				return type ? value : value + "px";
			}
			if (!window.getComputedStyle) { //If we are in IE8 and before, we can still get some properties
				if (prop === "height") value = element.offsetHeight; //Height
				else if (prop === "width") value = element.offsetWidth; //Width
				else if (element.currentStyle) { //Else, use currentStyle
					value = element.currentStyle[prop];
					value = type ? mScript.strToFloat(value) : value;
					//If we're looking for a string, or we cannot get a number
					return typeof value !== "undefined" ? value : null;
				}
			} else { //Otherwise
				if (marginRight.test(prop) && bugs.css.marginRightComputed) { //Some versions of webkit return unreliable right margin
					var style = element.style,
						olddisplay = style.display || getStyle(element,"display");
					style.display = "inline-block";
					value = (window.getComputedStyle(element,null) || {}).marginRight;
					style.display = olddisplay;
					return type ? mScript.strToFloat(value) : value;
				}
				computed = window.getComputedStyle(element,null);
				if (!computed) return null;
				//Percent bug can be fixed with width and height
				if (bugs.css.computedPercent && element.parentNode && (prop === "width" || prop === "height")) value = element.parentNode.offsetWidth * (parseFloat(computed[prop]) / 100);
				else value = prop === "filter" ? computed.getPropertyValue(prop) : computed[prop]; //From jQuery: .getPropertyValue() needs to be used for "filter" in IE9
				if (type && typeof value === "string") return mScript.strToFloat(value);
				return value !== undefined ? value : null;
			}
		},
		nextAndPrev = function(elms,method) {
			var arr = [],
				i = 0,
				len = elms.length,
				element;
			for (; i < len; i++) {
				element = elms[i];
				if (element.nodeType === 1) {
					while ((element = element[method])) {
						if (element.nodeType === 1) {
							arr.push(element);
							break; //Break out of loop
						}
					}
				}
			}
			return arr;
		},
		slice = (function() { //Safe slice (needs to be indirectly called: slice.call() or slice.apply())
			try {
				var arr = [];
				//Can we use slice (if defined) on node lists?
				arr.slice.call(document.documentElement.childNodes,0,2)[0].nodeType;
				//If so, use native function
				return arr.slice;
			} catch(e) { //Else, use custom function
				return function(i,ii) {
					var arr = [],
						len = this.length;
					if (typeof ii !== "number") ii = len;
					i = i || 0;
					for (; i < len && i < ii; i++) arr.push(this[i]);
					return arr;
				};
			}
		})(),
		//DOM events:
		//Ensure case-insensitivity when using .on() and .end()
		DOMEvents = "DOMControlValueChanged|DOMContentLoaded|DOMFrameContentLoaded|DOMActivate|DOMAttrModified|DOMCharacterDataModified|DOMNodeInserted|DOMNodeInsertedIntoDocument|DOMNodeRemoved|DOMNodeRemovedFromDocument|DOMSubtreeModified|DOMFocusIn|DOMFocusOut",
		//Replace DOM events
		//Ensures case-insensitivity
		DOMEventsReplace = (function() {
			var events = DOMEvents.split("|"),
				DOMEventsReplace = {},
				i = 0;
			for (; i < events.length; i++) DOMEventsReplace[events[i].toLowerCase()] = events[i];
			return DOMEventsReplace;
		})(),
		//RegExp that matches these events
		rDOMEvents = new RegExp("^" + DOMEvents + "$","i"),
		camelCase = /-([a-z])/gi, //Matching camelCase
		passToReady = function(callback) { //Passes function to .ready() list of events
			var exec = false; //We haven't executed our function yet
			function whenReady() { //Function that executes on DOMLoad
				if (exec) return this; //Return mScript
				exec = true; //If we've gone mScript far, we are ready to execute it
				callback();
				//Clean-up:
				if (document.removeEventListener) {
					document.removeEventListener("DOMContentLoaded",whenReady,false); //DOMContentLoaded
					window.removeEventListener("load",whenReady,false); //And fallback
				} else {
					document.detachEvent("onreadystatechange",callWhenReady,false); //Check on readystatechange event
					document.detachEvent("onload",whenReady,false); //Fallback
				}
			}
			if (document.addEventListener) { //If window.addEventListener is defined
				document.addEventListener("DOMContentLoaded",whenReady,false); //When DOM is ready
				//Fallback to load event
				window.addEventListener("load",whenReady,false);
			} else if (window.attachEvent) { //For IE
				var iFrame,
					callWhenReady = function() {
						if (document.readyState === "complete") whenReady(); //When we have access to the DOM
					};
				try { //Are we inside a frame?
					isFrame = window.frameElement != null;
				} catch(e) {}
				//IE: if the document is inside a frame
				//Use technique by Juriy Zaytsev
				//http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
				if ("onreadystatechange" in document) document.attachEvent("onreadystatechange",callWhenReady);
				else if (document.documentElement.doScroll && !isFrame) { //If document isn't inside a frame
					(function testReady() { //Tets if DOM is ready
						if (exec) return; //If we've executed our function, return
						try { //Else, try:
							document.documentElement.doScroll("left"); //If we can do this without an exception, DOM is ready
							whenReady();
						} catch(e) { //Repeated testing:
							setTimeout(testReady,25); //Check every 25ms
						}
					})();
				}
				//Fallback to load event:
				document.attachEvent("onload",whenReady,false);
			}
		},
		readyEvents = [], //Array to hold functions passed to .ready()
		scriptJS = /(?:application|text)\/(?:ecma|java)script/i, //JavaScript <script> tags
		evalScripts = function(xml) { //Evaluate scripts
			var scripts = xml.getElementsByTagName("script"), //Get all <script> elements
				i = 0,
				script;
			for (; i < scripts.length; i++) { //Loop through them
				//Only accept JavaScript
				if (!scripts[i].type || scriptJS.test(scripts[i].type)) {
					//Read <script><![CDATA[]]></script>
					//typeof script always === "string"
					script = (scripts[i].textContent || getInnerText(scripts[i]) || "");
					//Use global context eval
					//From http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
					//IE throws error on window.execScript.call()
					//window.execScript is IE only
					//We use jQuery's way of handling it:
					(window.execScript || function(script) { //Anonymous function for Firefox to handle correctly:
						window.eval.call(window,script);
					})(script);
				}
			}
		},
		nodeName = function(element) {
			return element ? element.nodeName.toLowerCase() : null;
		},
		endSpace = /\s+$/,
		allSpace = /^\s+$/g,
		moreThanOneSpace = /\s{2,}/g,
		specialChildren = /^(?:option|colgroup|tbody|thead|tfoot|tr|th|td)$/, //Elements that need special parents
		trColgroupParents = /^(?:tbody|thead|table|tfoot)$/, //Valid parents of <colgroup>, <tr>, and <th> elements
		parentChildValid = function(parent,child) { //Check if child belongs in parent
			var pname = nodeName(parent),
				cname = nodeName(child);
			if (specialChildren.test(cname) && ((cname === "option" && pname !== "select") || (cname === "colgroup" || cname === "tr") && !trColgroupParents.test(pname) || (cname === "tbody" || cname === "thead" || cname === "tfoot") && pname !== "table")) mScript.error(cname + " elements cannot be children of " + pname + " elements.");
			if (pname === "select" && cname !== "option") mScript.error("select elements may only directly contain option elements.");
			return true;
		},
		eventAttr = /^on/, //Test if an attribute begins with on
		/* .cdataScripts()
		* Prepends <![CDATA[
		* And appends ]]>
		* In every <script /> element
		*/
		scriptOpen = /<script(?:\s*[^<>](?:=["']?(?:[^"']|\\["'])*["']?)?\s*)*>((?:(?!<\/script>|(?:\/\*|\/\/)?[\f\t\r\n\x20]*<!\[CDATA\[(?:\/\*)?|(?:\/\*|\/\/)?\]\]>(?:\/\*)?)(?:<|[^<])*)*<\/script>)/i,
		scriptClose = /<\/script>/i,
		cdataScripts = function(str) {
			var open,close;
			while ((open = str.match(scriptOpen)) && (close = str.match(scriptClose))) str = str.replace(open[0],open[0].replace(open[1],"//<![CDATA[\r\n" + open[1])).replace(close[0],"\r\n//]]>" + close[0]);
			return str;
		},
		toHTML = function(elm) {
			//Non-elements
			//Inner documents/document fragments will not be copied
			if (elm.nodeType !== 1) return elm.cloneNode();
			var attrs = {},
				fragment = document.createDocumentFragment(),
				oldParent = elm.parentNode,
				children = elm.childNodes,
				events = [],
				ii,_attrs,attributes,currAttr,currName;
			if ((attributes = elm.attributes).length) {
				for (ii = 0; ii < attributes.length; ii++) {
					currAttr = attributes[ii];
					currName = currAttr.nodeName;
					if (eventAttr.test(currName)) events.push({
						type: currName,
						handler: new Function(currAttr.nodeValue)
					});
					else attrs[currName] = (getAttr(elm,currName,true) || ""); //Element is always an XML element
				}
			}
			if (children && children.length) {
				for (ii = 0; ii < children.length; ii++) {
					try { //IE throws exceptions:
						fragment.appendChild(toHTML(children[ii]));
					} catch(e) {}
				}
			}
			elm = document.createElement(nodeName(elm));
			for (ii in attrs) {
				if (mScript.hasProp(attrs,ii)) setAttr(elm,attrs[ii],ii);
			}
			//Handle inline events
			for (ii = 0; ii < events.length; ii++) elm[events[i].type] = events[i].handler || null;
			try { //IE may throw exception here:
				elm.appendChild(fragment);
			} catch(e) {}
			return elm;
		},
		primesNos = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107], //Some prime numbers that are common factors; used to speed up process
		bugs = { //Detect bugs
			/* The following properties are handled below:
			 * gradient
			 * opacity
			 * $float (cssFloat vs. styleFloat)
			 * computedPercent (tested on DOMReady, so default is false)
			 * marginRightComputed (tested on DOMReady, so default is false)
			 */
			css: {
				computedPercent: false,
				marginRightComputed: false
			},
			/* Multiple bugs related to:
			 ** .getAttribute()
			 ** .setAttribute()
			 ** .removeAttribute()
			 * Handled below
			 */
			attr: {},
			//Event-related bugs
			events: { //Since we are only setting them for IE, use default of false
				submit: false,
				focusin: false,
				change: false
			},
			script: {}
		},
		xmlActiveXVersion = window.ActiveXObject && (function() { //Supported ActiveXObject version for XML parsing
			//Do not check for specific support, as that would be too slow
			var options = ["MSXML2.DOMDocument","MSXML.DOMDocument","Microsoft.XMLDOM"],
				i = 0,
				len = options.length;
			for (; i < len; i++) { //Loop through all options (until one works)
				try { //Try:
					new ActiveXObject(options[i]);
					return options[i];
				} catch(e) {} //Catch error(s)
			}
		})(),
		//Adding custom bubbling to events:
		bubble = {},
		//Do we need a custom bubble
		needsCustomBubble = function(event) {
			return !!bugs.events["on" + event];
		},
		/* Safe way to get and set custom attributes
		 * Without the use of native methods
		 * .getAttribute()
		 * .setAttribute()
		 * For browsers that do not support them
		 */
		getUnknownAttr = function(element,name) {
			try { //IE decides to throw an error here
				var attr = element.attributes.getNamedItem(name);
				return (attr && attr.nodeValue) || null;
			} catch(e) {}
		},
		setUnknownAttr = function(element,name,val) {
			var i = 0,
				attrs = element.attributes,
				len = attrs.length,
				attr;
			for (; i < len; i++) {
				if (attrs[i].nodeName.toLowerCase() === name) {
					attrs[i].nodeValue = val;
					return;
				}
			}
			attr = document.createAttribute(name);
			attr.nodeValue = val;
			element.attributes.setNamedItem(attr);
		},
		//CSS properties that use plain numbers
		//opacity handled with $().opacity()
		plainNumberCSS = /^(?:z-?index|zoom)$/i,
		inputbutton = /^(?:input|button)$/i, //Test whether an element an <input> or a <button>
		boolAttr = /^(?:checked|selected|disabled|readonly|multiple|is[mM]ap|defer|no[rR]esize|async)$/, //Boolean HTML attributes
		whiteButNotSpace = /[\n\r\t\f]/g, //Match new lines, tabs, etc.
		//Enabling and disabling elements:
		enableDisable = function(disable) {
			return function() {
				var i = 0,
					len = this.length,
					nodeName;
				for (; i < len; i++) {
					if (this[i].nodeType === 1) {
						if (disable) this[i].setAttribute("disabled","disabled");
						else this[i].removeAttribute("disabled");
						//<link> and <style> also need their disabled property set
						if ((nodeName = this[i].nodeName.toLowerCase()) === "style" || nodeName === "link") this[i].disabled = disable;
					}
				}
				return this;
			};
		},
		/* Some attributes from:
		 * https://github.com/alexyoung/turing.js/blob/master/build/turing.js
		 * Turing.js, a JavaScript framework by Alex Young
		 */
		attrFix = {
			tabindex: "tabIndex",
			readonly: "readOnly",
			ismap: "isMap",
			maxlength: "maxLength",
			cellspacing: "cellSpacing",
			cellpadding: "cellPadding",
			rowspan: "rowSpan",
			colspan: "colSpan",
			usemap: "useMap",
			frameborder: "frameBorder",
			contenteditable: "contentEditable"
		},
		//Seperate objects for use in different cases
		forAndClass = {
			"for": "htmlFor",
			"class": "className"
		},
		/* Keep returned values consistant:
		 * IE returns booleans
		 * Bug-safe function below
		 */
		filterBool = function(val) {
			return val || null;
		},
		/* Safe way to:
		 * get attributes
		 * set attributes
		 * remove attributes
		 * See getUnknownAttr and setUnknownAttr
		 * to set attributes that are not natively a part of the element
		 */
		getAttr = function(element,attr,isXML) { //Safe way to get an element property
			if (!isXML) { //HTML elements:
				if (element.getAttribute && !bugs.attr.propVsAttr) {
					//For attribute fixes
					attr = attrFix[attr] || attr;
					//Second argument === case-insensitivity in IE
					//We are returning the cssText without .getAttribute(), as that is the easiest way
					return filterBool(attr === "style" ? element.style.cssText : element.getAttribute(attr,0),attr);
				} else {
					//For attribute problems
					attr = attrFix[attr] || forAndClass[attr] || attr;
					//Handle style differently
					return filterBool(attr === "style" ? element.style.cssText : attr !== "value" && typeof element[attr] !== "undefined" ? element[attr] : getUnknownAttr(element,attr),attr);
				}
			} else { //XML elements
				var attrs = element.attributes,
					i = 0,
					len = attrs.length;
				//We attributes them differently:
				if (attrs) {
					for (; i < len; i++) {
						if (attrs[i].nodeName.toLowerCase() === attr) return attrs[i].nodeValue;
					}
				}
				return null;
			}
		},
		setAttr = function(element,attr,val,isXML) {
			if (!isXML) { //HTML elements:
				//From jQuery:
				//Disallow the changing of the type attribute of <input>s and <button>s
				if (attr === "type" && inputbutton.test(element.nodeName) && element.parentNode) mScript.error("Type property of inputs and buttons cannot be changed.");
				if (boolAttr.test(attr) && val !== attr) mScript.error("Property " + attr + " cannot be set the value of " + val);
				else if (element.setAttribute && !bugs.attr.propVsAttr) {
					//For attribute problems
					attr = attrFix[attr] || attr;
					//Third argument === case-insensitivity in IE
					//Fixes for style attribute
					attr === "style" ? (element.style.cssText = val) : element.setAttribute(attr,val,0);
				} else {
					//For attribute problems
					attr = attrFix[attr] || forAndClass[attr] || attr;
					attr === "style" ? (element.style.cssText = val) : element[attr] !== undefined ? (element[attr] = val) : setUnknownAttr(element,attr,val);
				}
			} else { //XML elements:
				var attrs = element.attributes,
					i = 0,
					set,
					len = attrs.length;
				//We attributes them differently:
				if (attrs) {
					for (; i < len; i++) {
						if (attrs[i].nodeName.toLowerCase() === attr) {
							attrs[i].nodeValue = val;
							set = true;
							break;
						}
					}
					if (!set) {
						attrs = document.createAttribute(attr);
						attrs.nodeValue = val;
						element.attributes.setNamedItem(attrs);
					}
				}
			}
		},
		removeAttr = function(element,attr,isXML) {
			if (!isXML) { //HTML elements:
				if (element.removeAttribute && !bugs.attr.propVsAttr) {
					//For attribute problems
					//Notice that this time style refers to the attribute, and we aren't using .cssText
					attr = attrFix[attr] || attr;
					//Second argument === case-insensitivity in IE
					element.removeAttribute(attr,0);
				} else {
					//For attribute problems
					attr = attrFix[attr] || forAndClass[attr] || attr;
					attr === "style" ? (element.style.cssText = "") : element[attr] !== undefined ? (element[attr] = "") : setUnknownAttr(element,attr,"");
				}
			} else { //XML elements:
				var attrs = element.attributes,
					i = 0,
					len = attrs.length;
				//Don't use removeNamedItem, because it's not reliable and case-sensitive for XML
				if (attrs) {
					for (; i < len; i++) {
						if (attrs[i].nodeName.toLowerCase() === attr) {
							attrs[i].nodeValue = "";
							break;
						}
					}
				}
			}
		},
		/* .getInnerText()
		 * Getting innerText/textContent by getting children's node values
		 * Inspired by Sizzle
		 */
		getInnerText = function(elm) {
			var txt = "",
				nType = elm && elm.nodeType;
			if (nType === 1 || nType === 9 || nType === 11) {
				//.innerText ignores some characters
				if (typeof elm.textContent === "string") return elm.textContent;
				for (elm = elm.firstChild; elm; elm = elm.nextSibling) {
					txt += getInnerText(elm) || "";
				}
				return txt;
			} else if (nType === 3 || nType === 4) return elm.nodeValue; //Plain text and CDATA
		},
		//The four key-related events
		keyEvents = /^(?:keydown|keypress|keyup|textinput)$/,
		/* Key events cannot be added to window in IE
		 * Work around this bug by attaching them to document
		 * This function tests for such an event
		 */
		needsKeyTreatment = function(element,event) {
			return element === window && keyEvents.test(event);
		},
		nbsp = /&nbsp;/g, //Match &nbsp;, as it needs to be changed up
		//Match HTML elements that don't need to be closed: <br>
		//Also matches self-closed elements of such: <br />
		//Does not match <br></br>
		htmlSelfCloseInvalidXML = /<[\f\t\r\n\x20]*(area|br|col|embed|hr|img|input|link|meta|param)((?:(?:[\f\t\r\n\x20]*[\w\d\-]+(?:=["']?(?:[^>]|>)*["']?)?)*[\f\t\r\n\x20]*)*)\/?>(?!<\/[\f\t\r\n\x20]*\1[\f\t\r\n\x20]*>)/gi,
		tagOpen = /[\f\t\r\n\x20]*<([\f\t\r\n\x20]*[\w\d\-]+[\f\t\r\n\x20]*)[\f\t\r\n\x20]*(?:(?:[\f\t\r\n\x20]*[\w\d\-]+=["']?(?:[^>]|>)*["']?)*[\f\t\r\n\x20]*)*[\f\t\r\n\x20]*>/m,
		tagSelfClose = /[\f\t\r\n\x20]*<([\f\t\r\n\x20]*[\w\d\-]+[\f\t\r\n\x20]*)[\f\t\r\n\x20]*(?:(?:[\f\t\r\n\x20]*[\w\d\-]+=["']?(?:[^>]|>)*["']?)+[\f\t\r\n\x20]*)*[\f\t\r\n\x20]*\/>/m,
		selfClose = new RegExp("^" + tagSelfClose.source,"m"), //Self closing tags
		allSelfClose = /^[\f\t\r\n\x20]*<[\f\t\r\n\x20]*([\w\d\-])[\f\t\r\n\x20]*\/?>(?:<\/[\f\t\r\n\x20]*\1[\f\t\r\n\x20]*>)?$/m, //String that is made completely of a self-closed tag
		open = new RegExp("^" + tagOpen.source,"m"), //Invalid XML fixing; opening tag <tag> or <![CDATA[ (CDATA tag)
		close = /(?:<\/([\f\t\r\n\x20]*[\w\d\-]+[\f\t\r\n\x20]*)>|\]\]>)$/m, //Closing tag </tag> or ]]> (CDATA tag)
		toArrayObject = function(obj) { //Transforming an object into an array
			var results = [],
				prop,_float;
			for (prop in obj) {
				if (mScript.hasProp(obj,prop) && !isNaN((_float = parseFloat(prop))) && Math.round(_float) === _float) results.push(obj[prop]);
			}
			return results;
		},
		getProtoOf = Object.getPrototypeOf || function(obj) {
			return obj.__proto__ || obj.constructor && obj.constructor.prototype;
		},
		createObj = Object.create || function(protoObj) {
			var _Object = function() {}; //Constructors must be functions
			_Object.prototype = protoObj; //Set the prototype
			return new _Object(); //Create the object
		},
		objNoProto = function(obj,proto) {
			if (!proto) return obj;
			var temp = createObj(proto),
				prop;
			for (prop in obj) {
				if (obj[prop] && !temp[prop]) temp[prop] = obj[prop];
			}
			var _prototype = getProtoOf(temp);
			for (prop in _prototype) _prototype[prop] = undefined;
			return temp;
		},
		$wrap = function(elements) { //Create a wrapper object for our elements; that way, lower our load time by 5x+ times
			elements = elements || [];
			var i = 0,
				len = elements.length;
			for (; i < len; i++) this[i] = elements[i]; //All elements are added to the object
			this.length = len; //The length property as well
			this.selected = elements; //Our way to access the array
			return this;
		},
		toClass = {},
		//toClass:
		classes = "Array Boolean Date Number Object String".split(" "),
		len = classes.length,
		i = 0;
	for (; i < len; i++) toClass["[object " + classes[i] + "]"] = classes[i].toLowerCase();
	toClass["[object RegExp]"] = "RegExp"; //Camel-case for RegExp
	classes = i = len = undefined;
	(function() { //Bug detection:
		var div,children,input,has,select,object,script; //Declare variables
		div = document.createElement("div"); //Create a dummy <div>
		var divCSS = div.style; //Quick access to the dummy <div>'s style
		try { //IE may throw exception
			//Add CSS gradient properties
			divCSS.backgroundImage = "linear-gradient(left top, black, white)";
			divCSS.backgroundImage = "-o-linear-gradient(left top, black, white)";
			divCSS.backgroundImage = "-moz-linear-gradient(left top, black, white)";
			divCSS.backgroundImage = "-webkit-linear-gradient(left top, black, white)";
			divCSS.backgroundImage = "-ms-linear-gradient(left top, black, white)";
			divCSS.backgroundImage = "-webkit-gradient(linear, left top, right bottom, from(black), to(white))";
			//Check if browser can read them
			bugs.css.gradient = divCSS.backgroundImage.indexOf("gradient") === -1; //Return accordingly
		} catch(e) {
			bugs.css.gradient = true;
		}
		//We can run more tests with this one <div>
		//Do float and opacity tests
		//Use .cssText, because bug will not be detected with divCSS.opacity
		divCSS.cssText += "opacity:0.5;float:left;";
		//If we have a "bug" (although with a very simple solution)
		//Use IE's non-standard filters
		bugs.css.opacity = !/0\.5/.test(divCSS.opacity);
		bugs.css.$float = divCSS.cssFloat !== "left";
		div = divCSS = null; //Prevent memory leaks
		/* Attribute methods
		 * Commonly found bugs in older browsers
		 */
		div = document.createElement("div");
		//Are the methods even available
		bugs.attr.getAttr = !div.getAttribute;
		bugs.attr.setAttr = !div.setAttribute;
		bugs.attr.removeAttr = !div.removeAttribute;
		div.className = "divClass";
		//Create a test input
		input = document.createElement("input");
		input.type = "text";
		//IE uses property names:
		//If class doesn't work, we infer that for won't work either
		bugs.attr.propVsAttr = !bugs.attr.getAttr ? !div.getAttribute("class") : true;
		//Opera mixes up its style querying
		//However, that requires elements be inserted into DOM to test
		input.disabled = "disabled"; //Disable input
		//IE may return boolean values
		bugs.attr.$boolean = !bugs.attr.getAttr ? input.getAttribute("disabled") === true : true;
		//.removeAttribute() also doesn't work correctly on the style object
		bugs.attr.removeStyle = !bugs.attr.removeAttr && !bugs.attr.getAttr ? !!(div.removeAttribute("style") && div.getAttribute("style")) : true;
		div = input = null; //Prevent memory leaks
		/* Events supported?
		 * Techinque by Juriy Zaytsev
		 * http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
		 * Test if IE supports some of the problematic event handlers
		 * Also inspired by jQuery
		 */
		div = document.createElement("div");
		if (div.attachEvent) { //IE only:
			var events = {
					submit: 1,
					change: 2,
					focusin: 3
				},
				e,event,support;
			for (e in events) {
				event = "on" + e;
				support = event in div;
				if (!support) {
					div.setAttribute(event,"return;");
					support = typeof div[event] === "function";
				}
				//Pass to bugs objec t:
				bugs.events[e] = support;
			}
		}
		//See if we can evaluate <script>'s content (doesn't work in IE)
		try {
			script = document.createElement("script");
			script.innerHTML = "\"test\";";
			bugs.script.read = (script.innerText || script.textContent) !== "\"test\";";
		} catch(e) {
			bugs.script.read = true;
		}
		script = div = null; //Release memory
	})();
	if (bugs.attr.$boolean) {
		filterBool = function(val,orig) {
			//If we are working with a boolean attribute, filter it
			if (boolAttr.test(orig)) return val === true ? orig : null;
			return val || null;
		};
	}
	/* Create a custom bubbling event
	 * Adds event to element
	 * Then triggers all events of the parent nodes (added with mScript)
	 */
	var createCustomBubble = function(event,node,callback) {
			return function(node,callback) {
				node.attachEvent(event,function(obj,triggered) {
					var value = callback.call(node,obj);
					//If the event is triggered, do not bubble
					if (!triggered) {
						while ((node = node.parentNode)) mScript(node).trigger(event);
					}
					return value;
				});
			};
		},
		prop;
	for (prop in bugs.events) {
		if (bugs.events[prop]) {
			bubble[prop] = createCustomBubble("on" + prop);
		}
	}
	//DOMReady tests handled below
	/* Safe (cross-browser) .hasOwnProperty()
	 * Do not rely on for undefined values
	 * It will return false
	 * Custom version:
	 ** Looks for objects object inherits from
	 ** And if there is a match and it equals the value of the current object, it returns false
	 ** If prototype's method matches value of object's method, the function still returns true (after reliable checks)
	 */
	mScript.hasProp = coreHasOwn ? function(obj,prop) { //Cross browser .hasOwnProperty()
		return coreHasOwn.call(obj,prop);
	} : function(obj,prop) {
		if (!objOrFunct(obj)) return false;
		//Get all objects inside our object
		var proto = getProtoOf(obj),
			/* Gets object with prototype
			 * In turn, this prevents the following bug:
			 * Will mess up for cases such as:
			 * var obj = function() {this.length = 0;};
			 * obj.prototype = {length: 0};
			 * $.hasProp(new obj(),"length"); //Returns false
			 * Use of custom extend method required
			 */
			noProto = objNoProto(obj,proto);
		if (obj[prop] !== undefined) return noProto[prop] !== undefined;
		return false;
	};
	mScript.extend = function(obj,extend) { //Extending objects
		if (!objOrFunct(obj)) mScript.error(".extend() called on non-object.");
		var arglen = arguments.length,
			args = {},
			method,i;
		if (arglen > 2) {
			for (i = 1; i < arglen; i++) {
				if (arguments[i] && objOrFunct(arguments[i])) mScript.extend(obj,arguments[i]);
			}
			return obj;
		}
		for (method in extend) {
			//Undefined values will not be added
			if (mScript.hasProp(extend,method) && extend[method] !== undefined) obj[method] = extend[method];
		}
		return obj;
	};
	mScript.extend(mScript,{ //Extend the mScript function to add properties to it
		version: "1.0", //Assigns a string with the current version
		alias: function(name) { //Check if object is an alias of mScript
			return typeof name === "function" && !!(name.core && name.core.ismScript);
		},
		equal: function(obj,compare) { //Are to objects (or arrays) equal?
			if (!objOrFunct(obj) || !objOrFunct(compare)) mScript.error(".equal() called on non-object.");
			//If objects are equal anyway, return true
			if (obj === compare) return true;
			if (obj.constructor !== compare.constructor) return false;
			var i = 0,
				ii = 0,
				prop;
			for (prop in obj) {
				++i;
				if (mScript.hasProp(obj,prop)) {
					if (obj[prop] !== compare[prop]) return false;
				}
			}
			//Get length of second object
			for (prop in compare) ++ii;
			//Fix for:
			//obj.prop = undefined;
			//And obj.prop === compare.prop if compare.prop hasn't been manually set
			return i === ii;
		},
		type: function(obj) { //Detect an object's type
			return obj === null ? "null" : toClass[Object.prototype.toString.call(obj)] || typeof obj;
		},
		//Get the prototype of an object
		protoOf: function(obj) {
			if (!objOrFunct(obj)) mScript.error("Can't get the prototype of a non-object.");
			return getProtoOf(obj);
		},
		/* .indexOf()
		 * Get the index of an object's property
		 * Or the index of an array property value
		 */
		indexOf: function(obj,val) {
			if (obj && typeof obj.length === "number") { //For arrays
				if (indexOf) return indexOf.call(obj,val); //Use ECMAScript 5 method if available
				var i = 0,
					len = obj.length;
				for (; i < len; i++) {
					if (val === obj[i]) return i; //Return index
				}
				return -1; //Not found is -1
			}
			mScript.error(".indexOf() called on non-array."); //All other values are invalid
		},
		/* Create an object that inherits from another object
		 * Use native Object.create if available
		 * Otherwise, use a custom function
		 */
		createObject: function(proto) {
			if (!objOrFunct(proto)) mScript.error(".createObject() called on non-object.");
			return createObj(proto);
		},
		slice: function(obj,i,ii) { //Cross-browser .slice()
			i = i || 0;
			if (!obj || obj.nodeType || !objOrFunct(obj)) mScript.error(".slice() called on non-object.");
			return slice.call(obj,i,ii);
		},
		toArray: function(obj,callback) { //Get an object and convert it to an array
			if (!obj || obj.nodeType || !objOrFunct(obj)) mScript.error("Invalid object passed to .toArray().");
			if (typeof callback !== "function") return mScript.isArray(obj) ? obj : typeof obj.length === "number" ? mScript.slice(obj,0) : toArrayObject(obj);
			//We can have a filtering function:
			var i = 0,
				results = [],
				len,_i;
			if (typeof (len = obj.length) === "number") {
				for (; i < len; i++) {
					if (callback.call(obj[i],obj[i],i,obj)) results.push(obj[i]);
				}
			} else {
				for (i in obj) {
					if (!isNaN((_i = parseFloat(i))) && mScript.hasProp(obj,i) && Math.round(_i) === _i && callback.call(obj[i],obj[i],i,obj)) results.push(obj[i]);
				}
			}
			return results;
		},
		error: function(str) { //Template for throwing errors
			throw new Error("mScript: " + str);
		},
		toCamelCase: function(str) { //Convert CSS properties to camel case
			if (typeof str !== "string") mScript.error(".toCamelCase() called on non-string.");
			//Microsoft didn't use camel case on -ms- prefix (from jQuery)
			str = str.replace(msPrefix,"ms").replace(camelCase,toCamelCase);
			return str;
		},
		lengthOf: function(obj) { //Get the length of an object
			if (!objOrFunct(obj)) mScript.error(".lengthOf() called on non-object.");
			//Total length/size
			var size = 0,
				key;
			for (key in obj) {
				if (mScript.hasProp(obj,key)) ++size; //Increment size
			}
			return size; //Return value
		},
		/* Detect with AJAX object (and optionally version)
		 * The browser supports
		 * Allows one argument:
		 ** If set to true, IE will return ActiveXObject
		 ** Important because of methods allowed by object
		 * Object returned has method:
		 * .create(): create the supported AJAX object, or return null
		 */
		detectAJAX: function(recommend) {
			var rec = recommend ? !window.ActiveXObject : true, //If recommend is set to true, IE7 should return the ActiveXObject
				ajax = {
					create: function() { //Return a new AJAX request
						return this.name === "XMLHttpRequest" ? new XMLHttpRequest() : this.name === "ActiveXObject" ? new ActiveXObject(this.version) : null;
					}
				};
			//The XMLHttpRequest is simpler to test for
			if (window.XMLHttpRequest && rec) ajax.name = "XMLHttpRequest";
			else if (window.ActiveXObject) { //Test for a specific version of IE's ActiveXObject
				var version;
				try {
					version = "Microsoft.XMLHTTP";
					new ActiveXObject(version);
					ajax.version = version;
				} catch(e) {
					try {
						version = "Msxml2.XMLHTTP.6.0";
						new ActiveXObject(version);
						ajax.version = version;
					} catch(e) {
						try {
							version = "Msxml2.XMLHTTP.3.0";
							new ActiveXObject(version);
							ajax.version = version;
						} catch(e) {
							try {
								version = "Msxml2.XMLHTTP";
								new ActiveXObject(version);
								ajax.version = version;
							} catch(e) {}
						}
					}
				}
				if (ajax.version) ajax.name = "ActiveXObject";
			}
			return ajax; //Return
		},
		/* New version of .noajax()
		 * Allows callbacks and executes them
		 * Based on whether there is AJAX support
		 */
		noajax: function(support,noSupport) {
			if (support && typeof support === "object") {
				noSupport = support.noSupport;
				support = support.support;
			}
			if (mScript.ajaxSupport && typeof support === "function") support.call(window,mScript.supportedAJAX);
			else if (!mScript.ajaxSupport && typeof noSupport === "function") noSupport.call(window);
			return mScript.ajaxSupport;
		},
		cleanUp: function(deep) { //deep accepts true if you want to delete both $ and mScript
			//If we're only making sure that there is no conflict between mScript's $ and other libraries' $
			//Then we can return mScript, so that a new variable can be assigned (if so is wished)
			//E.g: var $m = mScript.cleanUp();
			//Also see $.alias()
			if (window.$ === mScript) window.$ = old.$; //If $ belongs to mScript, make it undefined (release control)
			if (deep && window.mScript === mScript) window.mScript = old.mScript; //Remove global reference to mScript
			return mScript; //Return mScript to allow replacement on the mScript variable; it is kept until manually removed by developer
		},
		strToFloat: function(str) { //Convert strings to numbers (if possible); otherwise, return original string
			var parsed;
			return !isNaN((parsed = parseFloat(str))) ? parsed : str;
		},
		//Note the use of window.NAME REQUIRED for ReferenceError NOT to be thrown
		canvasSupport: !!(window.HTMLCanvasElement && document.createElement("canvas").getContext), //Check whether the browser supports the native HTML5 <canvas> tag
		progressSupport: !!window.HTMLProgressElement, //Check whether the browser supports the <progress> tag
		each: function(obj,callback) {
			if (typeof callback !== "function") mScript.error("Invalid function passed to .each().");
			var i = 0,
				len;
			//For arrays:
			if (typeof (len = obj.length) === "number") {
				//This refers to obj[i]
				for (; i < len; i++) {
					if (callback.call(obj[i],obj[i],i) === false) break;
				}
			} else if (objOrFunct(obj)) { //Working with a plain object; no need to pass second argument, as we have checked for arrays already; functions will also work in this case
				for (i in obj) { //Use a for-in loop for objects
					if (mScript.hasProp(obj,i)) {
						if (callback.call(obj[i],obj[i],i) === false) break; //The this keyword refers to the current property
					}
				}
			} else mScript.error(".each() called on non-object.");
			return obj; //Return obj
		},
		/* Test if an element, document, or document fragment
		 * Is XML (lacks HTML methods)
		 * Also can call $(element).isXML()
		 */
		isXML: function(elm) {
			return !!elm && !(elm.documentElement || elm).style;
		},
		isHTML: function(elm) {
			return !!elm && !!(elm.documentElement || elm).style;
		},
		parseXML: function(val,noCheck) { //Parse
			if (!val || typeof val !== "string") return null;
			val = val.replace(nbsp,"&#xA0;"); //&nbsp; fixes
			var DOM,
				matchO = val.match(open), //Save in variables to preserve time
				matchC = val.match(close);
			//Some testing to ensure that are are parsing valid XML
			//Note that comments cannot be documentElements
			if (noCheck !== false && !selfClose.test(val) && (matchO && matchC ? matchO[1] !== matchC[1] : true)) val = "<documentElement>" + val + "</documentElement>";
			try {
				if (window.DOMParser) {
					var parser = new DOMParser(); //Create a DOM parser instance
					DOM = parser.parseFromString(val,"text/xml");
				} else if (xmlActiveXVersion) { //Check for AJAX support first, as we require the ActiveXObject
					DOM = new ActiveXObject(xmlActiveXVersion);
					DOM.async = false; //The function should not be async
					DOM.loadXML(val); //Load the XML
				}
			} catch(e) {}
			//Error handling
			if (!DOM || !DOM.documentElement || DOM.getElementsByTagName("parsererror").length) mScript.error("XML was not correctly formated and was not parsed.");
			return DOM; //Return XML
		},
		parseHTML: function(val,evalScript,skip) { //Parse HTML strings
			if (!val) return null;
			var xml,
				html,
				isStr = typeof val === "string";
			//Single tag
			if (isStr && (html = val.match(allSelfClose))) return [document.createElement(html[1])];
			//IE can't read <script> tags' contents
			if (isStr && (evalScript ? !bugs.script.read : true) && !skip) {
				//Try using .innerHTML
				//Much faster, but doesn't work in IE
				try {
					//Dummy <div>
					html = document.createElement("div");
					html.innerHTML = val;
					if (evalScript) evalScripts(html);
					return mScript.toArray(html.childNodes);
				} catch(e) {}
				//Fallback to custom parser...
			}
			//Do not do checks, as they may mess up inline handlers
			//HTML5 elements and other elements that don't need to be closed with /> handled here
			xml = isStr ? mScript.parseXML("<documentElement>" + (cdataScripts(val).replace(htmlSelfCloseInvalidXML,"<$1$2></$1>")) + "</documentElement>",false) : val; //Parse XML
			html = toHTML(xml.nodeType !== 1 ? xml.childNodes[0] : xml); //Convert all XML elements to HTML elements
			//If we are evaluating scripts
			//Use original XML, because HTML <script /> in IE has no innerText
			if (evalScript) evalScripts(xml);
			return isStr ? mScript.toArray(html.childNodes) : [html]; //Return elements (we are removing wrapper <div> here)
		},
		//mScript.events to hold events
		events: function() {
			//Similar to jQuery's Event object
			//No new constructor is needed
			if (!(this instanceof mScript.events)) return new mScript.events();
		},
		//Inspired by jQuery
		eventHolder: function(event) {
			if (!(this instanceof mScript.eventHolder)) return new mScript.eventHolder(event);
			if (!event) return;
			if (typeof event === "string") {
				this.type = event;
				return this;
			}
			var prop;
			for (prop in event) {
				if (!limitProp.test(prop) && mScript.hasProp(event,prop)) this[prop] = event[prop]; 
			}
			this.type = event.type;
			this.event = event;
			this.isDefaultPrevented = event.defaultPrevented || event.returnValue === false || (event.getPreventDefault && event.getPreventDefault()) ? rTrue : rFalse; 
			this.timeStamp = event.timeStamp || (new Date()).getTime();
			this.x = event.x || event.pageX || event.clientX;
			this.y = event.y || event.pageY || event.clientY;
			this.target = event.target;
		},
		/* .memory()
		 * Memory holder for mScript
		 * Easy way to store and remove memory
		 */
		memory: function(name,call,memorize) {
			if (typeof name !== "string") mScript.error(".memory() called with a non-string name.");
			var obj,type,prop;
			if (spaces.test(name)) { //Namespaces:
				obj = memory;
				var split = name.split(" "),
					i = 0,
					len = split.length;
				for (; i < len; i++) {
					if (!obj[split[i]]) obj[split[i]] = {};
					obj = obj[split[i]];
				}
			} else obj = memory[name] || (memory[name] = {}); //Create new memory subsection if needed if needed
			if (!obj.frozen && (type = typeof call) !== "undefined" && memory !== undefined) { //If we are saving data (not fetching)
				if (type === "string") obj[call] = memorize;
				else if (type === "object" || type === "function") {
					for (prop in call) {
						if (mScript.hasProp(call,prop) && prop !== undefined) obj[prop] = call[prop];
					}
				}
			}
			return mScript.memoryHolder(obj);
		},
		memoryHolder: function(obj) { //The prototype for our memory function:
			if (!(this instanceof mScript.memoryHolder)) return new mScript.memoryHolder(obj);
			if (!objOrFunct(obj)) mScript.error("Invalid object passed to .memory().");
			this.object = obj;
		},
		core: { //For objects/elements wrapped in $()
			constructor: mScript, //Our constructor is mScript
			ismScript: true, //All objects with this prototype are mScript objects
			extract: function() { //Extract elements from objects
				var ii,elm,len,
					i = 0,
					arr = [],
					_len = this.length,
					obj;
				for (; i < _len; i++) {
					obj = this[i];
					if (obj && (len = obj.length)) { //Arrays and/or array-like objects
						for (ii = 0; ii < len; ii++) {
							if (this[i][ii].nodeType) arr.push(this[i][ii]);
						}
					} else if (mScript.isObject(obj)) {
						for (elm in obj) {
							if (mScript.hasProp(obj,elm) && obj[elm] && obj[elm].nodeType) arr.push(obj[elm]);
						}
					} else if (obj.nodeType) arr.push(obj);
				}
				return new $wrap(arr);
			},
			/* $().$
			 * Finds elements inside queried ones
			 * Safe from querySelectorAll() context bugs
			 */
			$: function(selector,filter) {
				var isFilter = typeof filter === "function",
					wrap;
				if (this[0].nodeType) {
					wrap = new $wrap(mScript.cssSelector(selector,this.selected));
					if (isFilter) wrap.filter(filter);
					return wrap;
				}
				var i = 0,
					prop,
					len = this.length;
				wrap = [];
				for (; i < len; i++) {
					if ((prop = this[i][selector]) && (isFilter ? filter.call(this[i],prop,selector) : true)) wrap.push(prop);
				}
				return new $wrap(wrap);
			},
			filter: function(filter) {
				var i = 0,
					type = typeof filter,
					callback,
					args,
					arr = [],
					len = this.length;
				if (type === "function") {
					for (; i < len; i++) {
						if (filter.call(this[i],this[i],i)) arr.push(this[i]);
					}
				} else if (type === "string") {
					for (; i < len; i++) {
						if (mScript.is(filter,this[i])) arr.push(this[i]);
					}
				}
				return new $wrap(arr);
			},
			ready: function(callback) { //Ensures that all .ready() events are executed!
				if (this[0] === document && typeof callback === "function") {
					//this keyword refers to document
					var done = [], //Has the function been executed?
						execute = function() { //Create a function that will execute all of our functions
							var i = 0,
								len = readyEvents.length;
							for (; i < len; i++) { //Loop through our functions
								if (!done[i]) { //If the function hasn't been executed before
									readyEvents[i].call(document); //Execute events
									done.push(true); //Function has been executed
								}
							}
						};
					if (!readyEvents.length) passToReady(execute); //Execute events
					readyEvents.push(callback); //Add function to list
					//If DOM is ready and window has loaded, functions can still be executed using $.ready():
					if (mScript.windowLoadState) callback.call(document); //If document is already ready, still execute function
				} else if (typeof this[0] === "function") return $document.ready(this[0]); //Allow $(function).ready()
				return this; //Return mScript
			},
			center: function(parent) { //Center an element
				parent = parent && parent.$ && parent.ismScript ? parent[0] : null; //Allow a selected parent $("element").center($("parent"))
				var i = 0,
					len = this.length,
					elm,style;
				for (; i < len; i++) { //Loop through all elements
					if ((elm = this[i]).nodeType === 1) {
						style = elm.style; //Shorcut for style
						if (style) { //HTML elements only (non-XML)
							if (!parent) parent = elm.parentNode; //Default parent
							style.position = "relative"; //Set the position to relative
							//Set both left and right for consistancy
							//Document object doesn't have property offsetWidth
							style.left = style.right = (parent.offsetWidth || $document.width() - elm.offsetWidth) / 2 + "px"; //And compute distance from the left corner
						}
					}
				}
				return this; //Return mScript
			},
			each: function(callback) {
				if (this[0] && this[0].nodeType) return mScript.each(this,callback); //$(element).each()
				return mScript.each(this[0],callback); //$(obj).each()
			},
			remove: function() { //Function for removing elements from the DOM
				var i = 0,
					len = this.length,
					parent;
				//Loop through all elements and remove them
				for (; i < len; i++) {
					//We can't remove documents, document fragments, and elements that don't have a parent
					if (this[i] && (parent = this[i].parentNode)) parent.removeChild(this[i]);
				}
				return this; //Return mScript
			},
			/* CSS (styling) methods
			 * .getStyle(): get an element's style
			 * .style(): add or get style
			 * .opacity(): cross-browser way to set opacity
			 */
			getStyle: function(prop,type) { //Getting style
				return getStyle(this[0],prop,type);
			},
			/* mScript .style()
			 * Adds style to an element
			 * Uses the style[name] property whether possible
			 * Also allows use of !important rules
			 */
			style: function(style,val) {
				var type = typeof style,
					valType = typeof val,
					len = this.length,
					opacitySet,
					i,name;
				if (type === "undefined" && valType === "undefined") return this.attr("style");
				else if (type === "string" && !val) return getStyle(this[0],style,true); //Shortcut to access styles
				else {
					if (style && type === "object") { //If we are working with an object (a plain object) that states the properties
						for (name in style) {
							if (mScript.hasProp(style,name)) {
								for (i = 0; i < len; i++) {
									if (this[i].nodeType === 1) name === "opacity" && !opacitySet ? this.opacity(style[name]) && (opacitySet = true) : addStyle(this[i],name,typeof style[name] === "number" ? plainNumberCSS.test(name) ? style[name] + "" : style[name] + "px" : style[name]);
								}
							}
						}
					} else if (type === "string" && valType === "string" || valType === "number") {
						for (i = 0; i < len; i++) {
							if (this[i].nodeType === 1) style.toLowerCase() === "opacity" ? this.opacity(val) : addStyle(this[i],style,valType === "number" ? plainNumberCSS.test(style) ? val + "" : val + "px" : val);
						}
					} else mScript.error(".style() was called with incorrect arguments."); //Other, throw a Error
				}
				return this; //Return mScript to enable chaining 
			},
			opacity: function(val) { //Setting opacity using style method
				var type = typeof val;
				if (type === "string" || type === "number") { //Else, we're setting one
					val = typeof val === "string" ? mScript.strToFloat(val) : val;
					val = val > 1 ? 1 : val < 0 ? 0 : val;
					var i = 0,
						style;
					for (; i < this.length; i++) { //Loop through all elements
						if (this[i].nodeType === 1 && (style = this[i].style)) { //Don't let non-elements and XML elements
							if (!bugs.css.opacity) style.opacity = val; //And set the style; for non-IE
							else {
								//Bug fixes from jQuery
								//IE layout fix:
								style.zoom = style.zoom || 1;
								//Remove old filters:
								//Setting value to 1
								if (val === 1 && style.filter && style.removeAttribute) style.removeAttribute("filter");
								else style.filter = "alpha(opacity=" + val * 100 + ")"; //Only if value is less than one
								style.cssText += ";-ms-filter:\"progid:DXImageTransform.Microsoft.Alpha(Opacity=" + val * 100 + ")\";"; //IE8 filter
							}
						}
					}
					return this; //Return mScript to enable chaining
				} else {
					var opacity,match;
					return !bugs.css.opacity ? this.getStyle("opacity",true) : (opacity = this.getStyle("filter")) && (match = opacity.match(filterOpacity)) ? parseFloat(opacity.match(match[1])) || match[1] : (opacity = this.getStyle("-ms-filter")) && (match = opacity.match(msFilterOpacity)) ? parseFloat(match[1]) || match[1] : 1; //If there is no value, we are getting a value; we can only return one value (without using an object) at a time
				}
			},
			/* Event-related methods:
			 * .on(): adding events
			 * .end(): removing events
			 * .once(): an event that adds and removes itself by itself
			 * .trigger(): trigger an event attach with .on()
			 */
			/* Adding events
			 * Allows attaching of multiple events by writing:
			 * .on("event,event2,event3,eventx")
			 * Unlimited number of events can be added
			 * Requires the use of a callback argument
			 * Error is thrown otherwise
			 */
			on: function(event,callback,after) {
				var type = typeof event,
					i = 0,
					ii,len,elen,nType;
				//Events are case-insensitive; also allows use of hover instead of mouse over and active instead of mousedown
					//Also, a trailing comma is allowed: "click,hover,"
				if (event && type === "string") event = event.toLowerCase().replace(rhover,"mouseover").replace(ractive,"mousedown").replace(whitespace,"").replace(trailingComma,"");
				//Validation
				//If our event isn't a string
				else if (type !== "object") mScript.error(".on() invoked with incorrect arguments.");
				//We can also bind the ready handler inside .on(): .on("ready")
				/* Object map:
				 * .on({
				 * 		event: callback
				 * 		...
				 * 		eventx: callbackx
				 * });
				 */
				if (type === "object") {
					for (type in event) { //Loop through all events
						if (mScript.hasProp(event,type)) this.on(type,event[type]);
					}
					return this; //Return from here
				}
				if (eready.test(event)) { //However, we cannot use .end("ready")!
					this.ready(callback); //Add the ready event
					event = event.replace(removeready,"");
					if (!event) return this;
				}
				//$("element").on("load",f) should be handled a little different, as that way function is executed even after element has loaded
				//This behavior can be escaped with: $("element").on("load",f,false)
				if (eload.test(event) && mScript.windowLoadState > 1 && (after === undefined || after)) {
					this.each(function() {
						nType = this.nodeType;
						if (nType !== 3 && nType !== 8) callback.call(this);
					});
					event = event.replace(removeload,""); //Multiple events
				}
				event = event.split(",");
				len = this.length;
				elen = event.length;
				for (; i < len; i++) { //Loop through all elements
					//Only some elements can have events
					if ((nType = this[i].nodeType) !== 3 && nType !== 8) {
						if (this[i].addEventListener) { //For non-IE
							for (ii = 0; ii < elen; ii++) {
								//DOM events case-insensitivity
								event[ii] = DOMEventsReplace[event[ii]] || event[ii];
								$e.add(event[ii],callback,this[i]);
								this[i].addEventListener(event[ii],$e.get(event[ii],callback,this[i]),false); //Loop through all events and add them
							}
						} else if (this[i].attachEvent) { //For IE
							for (ii = 0; ii < event.length; ii++) {
								//DOM events case-insensitivity
								if (rDOMEvents.test(event[ii])) event[ii] = DOMEventsReplace[event[ii]];
								$e.add(event[ii],!needsCustomBubble(event[ii]) ? callback : bubble[event[ii]](this[i],callback),this[i]);
								needsKeyTreatment(this[i],event[ii]) ? document.attachEvent("on" + event[ii],$e.get(event[ii],callback,this[i],true)) : this[i].attachEvent("on" + event[ii],$e.get(event[ii],callback,this[i],true)); //Loop through all events and add them
							}
						}
					}
				}
				return this; //Return mScript
			},
			/* Stop an event
			 * Allows stopping of multiple events by writing:
			 * .end("event,event2,event3,eventx")
			 * Unlimited number of events may be stopped
			 * Requires the use of a callback argument
			 * Error is thrown otherwise
			 */
			end: function(event,callback) {
				var type = typeof event,
					i = 0,
					len = this.length,
					ii,nodeType,currEvent,events,usedEvent,elen;
				//Events are non-case sensitive; also allows use of hover instead of mouse over and active instead of mousedown
				//Trailing comma allowed: "click,hover,"
				if (event && type === "string") event = event.toLowerCase().replace(rhover,"mouseover").replace(ractive,"mousedown").replace(spaces,"").replace(trailingComma,"");
				//Validation
				//If our event isn't a string
				else if (type !== "object") mScript.error(".end() requires two arguments: an event (which must always be a string) and a callback (which must always be a function).");
				//Wildcard: removes all events off an element
				if (event === "*") {
					for (; i < len; i++) {
						//Some elements can't have events
						if ((nodeType = this[i].nodeType) !== 3 && nodeType !== 8) {
							events = $e.getAll(null,callback,this[i],!!this[i].detachEvent);
							for (ii = 0; ii < events.length; ii++) {
								if (this[i].removeEventListener) this[i].removeEventListener(events[ii].event,events[ii].callback,false);
								else if (this[i].detachEvent) {
									needsKeyTreatment(this[i],events[ii].event) ? document.detachEvent("on" + events[ii].event,events[ii].callback) : this[i].detachEvent("on" + events[ii].event,events[ii].callback);
								}
								$e.remove(events[ii].event,events[ii].callback,this[i]);
							}
						}
					}
				}
				/* Object map:
				 * .end({
				 * 		event: callback
				 * 		...
				 * 		eventx: callbackx
				 * });
				 */
				else if (type === "object") {
					for (type in event) { //Loop through all events
						//If object has a function handler
						if (mScript.hasProp(event,type)) this.end(type,event[type]);
					}
					return this; //Return
				}
				//DOM events case-insensitivity
				event = DOMEventsReplace[event] || event;
				event = event.split(",");
				//Remove all events of a certain type
				if (!callback) {
					for (; i < len; i++) {
						//Some elements can't have events
						if ((nodeType = this[i].nodeType) !== 3 && nodeType !== 8) {
							for (ii = 0; ii < event.length; ii++) {
								currEvent = DOMEventsReplace[(currEvent = event[ii])] || currEvent;
								events = $e.getAll(currEvent,callback,this[i],!!this[i].detachEvent);
								elen = events.length;
								for (iii = 0; iii < elen; iii++) {
									usedEvent = events[iii];
									if (this[i].removeEventListener) this[i].removeEventListener(usedEvent.event,usedEvent.callback,false);
									else if (this[i].detachEvent) {
										needsKeyTreatment(this[i],currEvent) ? document.detachEvent("on" + usedEvent.event,usedEvent.callback) : this[i].detachEvent("on" + usedEvent.event,usedEvent.callback);
									}
									$e.remove(usedEvent.event,usedEvent.callback,this[i]);
								}
							}
						}
					}
				} else {
					for (; i < len; i++) { //Loop through all elements
						//Some elements can't have events
						if ((nodeType = this[i].nodeType) !== 3 && nodeType !== 8) {
							for (ii = 0; ii < event.length; ii++) {
								currEvent = DOMEventsReplace[(currEvent = event[ii])] || currEvent;
								//For non-IE
								if (this[i].removeEventListener) this[i].removeEventListener(currEvent,$e.get(currEvent,callback,this[i]),false); //Loop through all events and remove them
								//For IE
								else if (this[i].detachEvent) needsKeyTreatment(this[i],currEvent) ? document.detachEvent("on" + currEvent,$e.get(currEvent,callback,this[i],true)) : this[i].detachEvent("on" + currEvent,$e.get(currEvent,callback,this[i],true)); //Loop through all events and remove them
								$e.remove(currEvent,callback,this[i]);
							}
						}
					}
				}
				return this; //Return mScript
			},
			/* Trigger functions added with .on()
			 * If function was not added with .on(), it will NOT be executed
			 */
			trigger: function(event,callback) {
				//$(element).trigger() triggers all events anyway
				event = (event === "*" || !event ? "" : event.toLowerCase().replace(rhover,"mouseover").replace(ractive,"mousedown").replace(spaces,"").replace(trailingComma,"")).split(",");
				var i = 0,
					len = this.length,
					elength = event.length,
					currEvent,ii,ii,events,evlen;
				for (; i < len; i++) {
					for (ii = 0; ii < elength; ii++) {
						//DOM events case-insensitivity
						currEvent = DOMEventsReplace[(currEvent = event[ii])] || currEvent || null;
						//Get all matching events
						//Don't use callback that is called to element
						//We'll call it ourselves, so that we can set the triggered attribute
						events = $e.getAll(event[ii],callback,this[i]);
						evlen = events.length;
						for (iii = 0; iii < evlen; iii++) events[iii].callback.call(this[i],mScript.eventHolder({
							type: event[ii],
							target: this[i]
						}),true);
					}
				}
				return this;
			},
			once: function(event,callback,after) { //Add an event that automatically removes itself after being executed
				function handler(obj) { //Create a seperate function to escape use of ECMAScript 5 strict mode, arguments.callee
					mScript(this).end(event,handler); //Remove the event
					//"Set" value of this
					return callback.call(this,obj); //Enable "return false" trick
				}
				return this.on(event,handler,after); //Add event
			},
			innerText: function(text) { //Either append or return text
				if (typeof text === "string") { //If text is an argument
					var nType,elm,
						i = 0,
						len = this.length;
					if (!add.test(text)) this.clear();
					else text = text.replace(add,"");
					for (; i < len; i++) {
						nType = (elm = this[i]).nodeType;
						if (nType === 3 || nType === 8) elm.nodeValue += text;
						else elm.appendChild(elm.ownerDocument.createTextNode(text));
					}
				} else return getInnerText(this[0]) || ""; //Otherwise, return textContent
				return this; //Return mScript
			},
			innerHTML: function(html) { //Get and/or set an element's innerHTML
				if (typeof html !== "string") return this[0].innerHTML; //Return the HTML of the first element
				else { //If we're setting HTML
					var cleared = 0,
						caught = 0,
						i = 0,
						tlen = this.length,
						clear,ii,parsed,len,nType,
						htmlNoAdd = html.replace(add,"");
					//HTML strings:
					if (tagOpen.test(htmlNoAdd) || tagSelfClose.test(htmlNoAdd)) {
						if (add.test(html)) { //We can append HTML by writting "+=html"
							html = htmlNoAdd;
							for (; i < tlen; i++) {
								if ((nType = this[i].nodeType) !== 3 && nType !== 8) {
									//For browsers with complete support
									//Append HTML; note that we parse and append
									//That way, elements don't loose events, etc.
									//Don't use try-catch, because $.parseHTML already does
									ii = 0;
									parsed = mScript.parseHTML(html);
									len = parsed.length;
									for (; ii < len; ii++) this[i].appendChild(parsed[ii]);
								}
							}
						} else { //Otherwise, we are setting HTML
							clear = true;
							for (; i < tlen; i++) {
								if (this[i].nodeType !== 3 && this[i].nodeType !== 8) {
									try { //Browsers without complete support
										this[i].innerHTML = html; //Set HTML
									} catch(e) {
										++caught;
										break;
									}
								}
							}
						}
						if (caught) {
							if (!cleared && clear) { //Only clear once
								this.clear(); //Clear elements
								++cleared;
							}
							//Append it:
							//We use the following approach, because otherwise IE throws exceptions
							this.each(function() {
								var i = 0,
									parsed = mScript.parseHTML(html,true,true);
								for (; i < parsed.length; i++) mScript(parsed[i]).appendTo(this);
							});
						}
					} else { //Text nodes:
						add.test(html) ? (html = htmlNoAdd) : this.clear();
						for (; i < this.length; i++) {
							try { //IE throws an exception here but does the job
								if (this[i].nodeType !== 3 && this[i].nodeType !== 8) this[i].appendChild(document.createTextNode(html));
							} catch(e){}
						}
					}
				}
				return this; //Return mScript
			},
			clear: function() { //Remove all children from an element; similar to: $("element").children().remove()
				var i = 0,
					nType,elm,
					len = this.length;
				for (; i < len; i++) { //Loop through all elements
					if ((nType = (elm = this[i]).nodeType) !== 3 && nType !== 8) {
						while (elm.firstChild) elm.removeChild(elm.firstChild); //And remove children
					} else this[i].nodeValue = "";
				}
				return this; //Return mScript
			},
			/* Form methods:
			 * .value(): gets the value
			 * .reset(): resets value/form
			 * .submit(): submits form
			 */
			value: function(val) { //Get and/or set the value of form elements
				if (!val && val !== "") return this[0].value; //If we aren't setting a value, get the value and return it
				else { //Otherwise
					var i = 0,
						len = this.length;
					if (add.test(val)) { //We can append a certain value
						val = val.replace(add,"");
						for (; i < len; i++) {
							if (this[i].nodeType === 1) this[i].value += val;
						}
					} else { //Or just set it
						//Loop through all elements and set value
						for (; i < len; i++) {
							if (this[i].nodeType === 1) this[i].value = val;
						}
					}
				}
				return this; //Return mScript
			},
			reset: function() {
				var i = 0,
					len = this.length,
					tag;
				for (; i < len; i++) {
					if (this[i].nodeType === 1) {
						tag = nodeName(this[i]);
						if (tag === "input") this[i].value = "";
						else if (tag === "form") this[i].reset();
					}
				}
				return this;
			},
			submit: function() { //Submitting forms
				var i = 0,
					len = this.length;
				for (; i < len; i++) {
					if (this[i].nodeType === 1 && nodeName(this[i]) === "form") this[i].submit();
				}
				return this;
			},
			/* Inserting elements into the DOM
			 * .after(): insert an element after another element
			 * .before(): insert an element before another element
			 * .append(): append an element inside another element (or text)
			 * .prepend(): prepend an element inside another element (or text)
			 * .appendTo(): append an element to another element
			 * .prependTo(): prepend an element to another element
			 */
			before: function(element) { //Insert an element before another element
				insert("before",element,this);
				return this; //Return mScript to enable chaining
			},
			after: function(element) { //Insert an element after another element
				insert("after",element,this);
				return this; //Return mScript to enable chaining
			},
			append: function(what) {
				var type;
				if (what && what.nodeType) what = [what];
				if ((type = typeof what) === "object" && what) {
					for (var i = 0; i < what.length; i++) {
						if (this[0].nodeType !== 3 && this[0].nodeType !== 8) this[0].appendChild(what[i]);
					}
				} else if (type === "string") this.innerHTML("+=" + what); //Use .innerHTML() for cross-browser appending
				else mScript.error(".append() was not supplied with a valid first argument.");
				return this; //Return mScript
			},
			prepend: function(what) { //Function for pre-pending
				var i = 0,
					nType,elm,type,ii,parsed,len;
				if (what && what.nodeType) what = [what];
				if (what && (type = typeof what) === "object" && typeof what.length === "number") {
					len = what.length;
					for (; i < len; i++) {
						if ((nType = (elm = this[0]).nodeType) !== 3 && nType !== 8) elm.firstChild ? elm.insertBefore(what[i],elm.firstChild) : elm.appendChild(what[i]);
					}
				} else if (type === "string") { //Otherwise
					len = this.length;
					for (; i < len; i++) { //Loop through all elements
						if ((nType = (elm = this[i]).nodeType) !== 3 && nType !== 8) {
							//HTML strings:
							if (tagOpen.test(what) || tagSelfClose.test(what)) {
								parsed = mScript.parseHTML(what);
								ii = parsed.length;
								//Loop backwards
								while (ii--) elm.firstChild ? elm.insertBefore(parsed[ii],elm.firstChild) : elm.appendChild(parsed[ii]);
							} else elm.firstChild ? elm.insertBefore(document.createTextNode(what),elm.firstChild) : elm.appendChild(document.createTextNode(what)); //Text nodes
						}
					}
				} else mScript.error(".prepend() was not supplied with a valid first argument.");
				return this; //Return mScript
			},
			appendTo: function(parent) {
				var i = 0,
					len = this.length,
					nType;
				if (parent && parent.nodeType) parent = [parent];
				if (parent && typeof parent === "object" && (nType = (parent = parent[0]).nodeType) !== 3 && nType !== 8) {
					for (; i < len; i++) parent.appendChild(this[i]); //Append element
				} else mScript.error(".appendTo() was not given a valid parent.");
				return this; //Return mScript
			},
			prependTo: function(parent) {
				var i = 0,
					len = this.length,
					nType;
				if (parent && parent.nodeType) parent = [parent];
				if (parent && typeof parent === "object" && (nType = (parent = parent[0]).nodeType) !== 3 && nType !== 8) {
					for (; i < len; i++) parent.firstChild ? parent.insertBefore(this[i],parent.firstChild) : parent.appendChild(this[i]); //Append element
				} else mScript.error(".prependTo() was not given a valid parent.");
				return this; //Return mScript
			},
			children: function(deep) { //Get the children of an element
				var arr = [], //A temporary array
					i = 0,
					len = this.length,
					ii,kids,klen;
				for (; i < len; i++) { //Loop through all elements
					if ((kids = this[i].childNodes)) {
						klen = kids.length;
						//We only get element nodes
						for (ii = 0; ii < klen; ii++) {
							if (kids[ii].nodeType === 1 && mScript.indexOf(arr,kids[ii]) === -1) arr.push(kids[ii]);
						}
					}
				}
				return new $wrap(tempArray); //Return an mScript object
			},
			parents: function() { //Get the parent nodes of elements
				var arr = [], //A temporary array to hold results
					i = 0,
					len = this.length,
					parent;
				for (; i < len; i++) { //Loop through all elements
					//Get the same element only once
					if ((parent = this[i].parentNode) && parent.nodeType === 1 && mScript.indexOf(arr,parent) === -1) arr.push(parent);
				}
				return new $wrap(arr); //Return an mScript object
			},
			siblings: function() { //Get all siblings
				var arr = [],
					len = this.length,
					i = 0,
					nType;
				for (; i < len; i++) {
					//Comments and text nodes can't have children
					if ((nType = this[i].nodeType) !== 3 && nType !== 8) pushSiblings(this[i],arr);
				}
				return new $wrap(arr);
			},
			prev: function() { //Get the previous element
				return new $wrap(nextAndPrev(this,"previousSibling"));
			},
			next: function() {
				return new $wrap(nextAndPrev(this,"nextSibling"));
			},
			index: function(elements) { //Get certain elements using $(): $().index(indexes)
				var len = this.length;
				if (elements === "*" || arguments.length === 0) return this; //If we are wanting all elements, return mScript
				if (elements === "last" || elements === "first") return new $wrap([this[elements === "first" ? 0 : len - 1]]);
				var indexes = mScript.toArray(arguments,function(val,prop,obj) { //Filter arguments:
						return !isNaN(val) && val < 0 ? (obj[prop] = val + len) > 0 : true;
					}),
					elems = [], //Another empty array
					i = 0;
				indexes.sort(function(a,b) { //Sort our array, so that we can loop directly
					return a-b;
				});
				for (; i < len; i++) { //Loop through all elements
					if (mScript.indexOf(indexes,i) !== -1) elems.push(this[i]);
				}
				return new $wrap(elems); //Return mScript
			},
			show: function() { //Displays elements
				var i = 0,
					len = this.length;
				for (; i < len; i++) {
					if (this[i].nodeType === 1 && getStyle(this[i],"display") === "none") this[i].style.display = "block"; //Display the element
				}
				return this; //Return mScript
			},
			hide: function() { //Hide elements
				var i = 0,
					len = this.length;
				for (; i < len; i++) {
					if (this[i].nodeType === 1 && getStyle(this[i],"display") !== "none") this[i].style.display = "none"; //Hide the element
				}
				return this; //Return mScript
			},
			height: function(val) { //Get and/or set an element's height
				if (!val) return getStyle(this[0],"height",true);//If we are getting a value
				else { //If we're setting a value
					if (parseFloat(val) > 0) {
						var i = 0,
							len = this.length;
						for (; i < len; i++) {
							if (this[i].nodeType === 1) this[i].style.height = typeof val === "number" ? val + "px" : val; //Loop through all elements and set the value
						}
					} else mScript.error("Height cannot be set to a negative value.");
				}
				return this; //Return mScript
			},
			width: function(val) { //Get and/or set an element's width
				if (!val) return getStyle(this[0],"width",true); //If we are getting a value
				else { //If we're setting a value
					if (parseFloat(val) > 0) {
						var i = 0,
							len = this.length;
						for (; i < len; i++) {
							if (this[i].nodeType === 1) this[i].style.width = typeof val === "number" ? val + "px" : val; //Loop through all elements and set the value
						}
					} else mScript.error("Height cannot be set to a negative value.");
				}
				return this; //Return mScript
			},
			/* Attributes:
			 * To get attributes:
			 * .attr(attribute);
			 * To set attributes:
			 * .attr(attribute,value);
			 * ... or ...
			 * .attr({
			 * 		attr: val,
			 * 		attr1: val1,
			 * 		attrx: valx
			 * });
			 * If value is true, then the attribute's value is equal to its name
			 * If it is false, the attribute is completely removed using .removeAttr() (defined above)
			 */
			attr: function(attribute,val) { //Get and/or set an attribute
				var isXML,value,
					type = typeof attribute,
					i = 0,
					len = this.length;
				//.attr("attr",null) === .attr("attr",false)
				if (val === null) val = false;
				if (!attribute || type !== "string" && type !== "object") mScript.error(".attr() attribute value was not a valid first argument.");
				attribute = type === "string" ? attribute.toLowerCase() : attribute;
				//Use of false as val will clear out the attribute!
				if (attribute && type !== "object" && val === undefined && this[0].nodeType === 1) return getAttr(this[0],attribute,mScript.isXML(this[0])); //Return value
				else { //Else, set value
					if (val === false) { //Removing a single attribute
						for (; i < len; i++) {
							if (this[i].nodeType === 1) {
								isXML = mScript.isXML(this[i]);
								removeAttr(this[i],attribute,isXML);
							}
						}
					} else {
						for (; i < len; i++) {
							if (this[i].nodeType === 1) { //Filter to elements only
								isXML = mScript.isXML(this[i]);
								if (type === "object") {
									for (value in attribute) { //For object: .attr({attr:val,attr2:val2...});
										if (mScript.hasProp(attribute,value)) {
											attribute[value] !== false && attribute[value] !== null //Are we removing or setting an attribute
												? setAttr(this[i],value.toLowerCase(),typeof attribute[value] === "number" ? attribute[value] + "" : attribute[value] === true ? value : attribute[value],isXML) //Set value
												: removeAttr(this[i],value.toLowerCase(),isXML); //Remove attribute
										}
									}
								} else setAttr(this[i],attribute.toLowerCase(),typeof val === "number" ? val + "" : val === true ? attribute : val,isXML); //Set value
							}
						}
					}
				}
				return this; //Return mScript
			},
			disable: enableDisable(true),
			enable: enableDisable(false),
			//For CSS classes:
			addClass: function(cssClass) { //Add a CSS class to an element
				var i = 0,
					len = this.length,
					className,
					_cssClass = " " + cssClass + " ";
				for (; i < len; i++) { //Loop through all elements
					if (this[i].nodeType === 1) { //Limit to elements only
						className = (" " + (this[i].className || "") + " ").replace(whiteButNotSpace,"");
						if (className.indexOf(_cssClass) === -1) this[i].className = ((this[i].className || "") + " " + cssClass).replace(rtrim,"").replace(moreThanOneSpace," "); //If element doesn't have that class already, add it
					}
				}
				return this; //Return mScript
			},
			removeClass: function(cssClass) { //Remove an element's CSS class
				var className,oclassName,classes,ii,clen,
					len = this.length,
					i = 0;
				for (; i < len; i++) { //Loop through all elements
					if (this[i].nodeType === 1 && this[i].className) {
						classes = this[i].className.split(" ");
						clen = classes.length;
						for (ii = 0; ii < clen; ii++) {
							classes[ii] = classes[ii].replace(whiteButNotSpace," ");
							while (classes[ii].indexOf(cssClass) > -1) classes[ii] = classes[ii].replace(cssClass," ").replace(rtrim,"").replace(moreThanOneSpace," ");
						}
						this[i].className = classes.join(" ").replace(endSpace,"");
						//If attribute is only spaces (or empty), remove it completely
						if (allSpace.test(this[i].className) || !this[i].className) this.attr("class",false);
					}
				}
				return this; //Return mScript
			},
			replaceClass: function(oldClass,newClass) { //Replace an element's CSS class
				return this.removeClass(oldClass).addClass(newClass); //Return mScript
			},
			toggleClass: function(first,second) { //Toggle between classes
				var i = 0,
					len = this.length;
				for (; i < this.length; i++) {
					if (this[i].nodeType === 1) { //Elements only
						var className = (" " + this[i].className + " ").replace(whiteButNotSpace,"");
						if (className.indexOf(" " + first + " ") > -1) this.replaceClass(first,second);
						else if (className.indexOf(" " + second + " ") > -1) this.replaceClass(second,first);
						else this.addClass(first);
					}
				}
				return this; //Return mScript
			},
			hasClass: function(cssClass) { //Check if an element has a certain CSS class
				return (" " + (this[0].className || "") + " ").replace(whiteButNotSpace," ").indexOf(" " + cssClass + " ") > -1;
			},
			len: function() { //Return/set the length of the this array
				return this.length; //We return the value
			},
			/* $(element).isXML()
			 * Alias for $.isXML, only that it works with mScript object
			 */
			isXML: function() {
				return mScript.isXML(this[0]);
			},
			isHTML: function() {
				return mScript.isHTML(this[0]);
			},
			/* Object methods
			 * (for arrays and functions)
			 * $(obj).method()
			 * ... works like ...
			 * $.method(obj)
			 */
			type: function() {
				return mScript.type(this[0]);
			},
			indexOf: function(val) {
				return mScript.indexOf((this[0] && this[0].nodeType ? this : this[0]),val);
			},
			lengthOf: function() {
				return mScript.lengthOf(this[0]);
			},
			isArray: function() {
				return mScript.isArray(this[0]);
			},
			isFunction: function() {
				return mScript.isFunction(this[0]);
			},
			isObject: function(plain) {
				return mScript.isObject(this[0],plain);
			},
			hasProp: function(prop) {
				return mScript.hasProp(this[0],prop);
			},
			equal: function(obj) {
				return mScript.equal(this[0],obj);
			},
			extend: function() {
				var args = mScript.toArray(arguments);
				args.unshift(this[0]);
				mScript.extend.apply(mScript,args);
				return this; //Chaining
			},
			createObject: function() {
				return mScript.createObject(this[0]);
			},
			protoOf: function() {
				return mScript.protoOf(this[0]);
			},
			/* .toArray() uses context to determine what you are applying it to
			 * If you have selected an object, it returns $.toArray(obj)
			 * If you are working with elements, it will return the array of elements
			 */
			toArray: function(callback) {
				var node = this[0] && this[0].nodeType;
				return node && !callback ? this.selected : mScript.toArray(node ? this.selected : this[0],callback);
			},
			slice: function(i,ii) {
				return new $wrap(mScript.slice(this[0] && this[0].nodeType ? this : this[0] ? this[0] : [],i,ii));
			},
			get: function(a,b) {
				return typeof a !== "number" ? this.toArray() : mScript.slice(this[0] && this[0].nodeType ? this : this[0] ? this[0] : [],i,ii);
			},
			/* Internal usage only
			 * .splice()
			 * .push()
			 * Do NOT operate on mScript object
			 */
			splice: [].splice,
			push: [].push
		},
		numMatches: function(str,pattern) { //Match how many times you find (a) certain character(s) in a string
			var type = mScript.type(pattern);
			//If pattern is a regular expression
			//We can use match with global flag
			if (type === "RegExp") return (str.match(new RegExp(pattern.source,"g" + (pattern.multiline ? "m" : "") + (pattern.ignoreCase ? "i" : ""))) || []).length;
			if (type === "string") {
				var matches = 0; //How many matches do we have?
				while (str.indexOf(pattern) > -1) {
					++matches;
					str = str.replace(pattern,"");
				}
				return matches; //Return number of matches
			}
			mScript.error("Invalid argument pseed to .numMatches().");
		},
		//Trim BOM and NBSP
		//Inspired by jQuery
		trim: coreTrim && !coreTrim.call("\uFEFF\xA0") ? function(str) {
			return coreTrim.call(str);
		} : function(str) {
			return str.replace(rtrim,"");
		},
		/* .split()
		 * Advanced splitting method
		 * Accepts either a RegExp, string, or function as split
		 * If function is provided, value is split on every returned truthy value
		 */
		split: function(str,split) {
			if (typeof str !== "string") mScript.error("Non-string passed to .split().");
			if (typeof split === "function") {
				var i = 0,
					arr = [""],
					len = str.length;
				for (; i < len; i++) {
					if (!split(str,str[i])) arr[arr.length - 1] += str[i];
					else arr[arr.length] = "";
				}
				return arr;
			}
			return str.split(split); //We assume it's a RegExp or string
		},
		/* MATH OBJECT: mScript.math
		 * Call as $.math
		 */
		math: { //Create a mathematics object
			square: function(x) { //Create a squaring (x*x) function
				return x*x;
			},
			cube: function(x) { //Create a cubing function (x*x*x)
				return x*x*x;
			},
			hypotenuse: function(y,w) { //Create a function for finding hypotenuse
				return Math.sqrt(y * y + w * w); //Return squared y and add it to squared w; uses mScript.math alias, math
			},
			even: function(x) { //Finds out if a number is even
				return !!x && x % 2 === 0;
			},
			odd: function(x) { //Finds out if a number is odd
				return !!x && x % 2 !== 0;
			},
			positive: function(x) { //Check if number is positive
				return x > 0;
			},
			negative: function(x) { //Check if number is negative; function is written again, because of issues with the number 0
				return x < 0;
			},
			polydegs: function(sides) { //Defines function for finding the total degrees in a polygon
				if (sides < 3) mScript.error("math.polydegs(): All polygons have 3+ sides."); //Get the number of sides, and throw a Error if they are less than 3
				else return 180 * (sides - 2); //Otherwise, continue and add the formula
			},
			average: function(nums) { //Function for finding the average
				var numbers = [], //Create an empty array
					total = 0,
					i = 0;
				for (; i < arguments.length; i++) { //Get all arguments
					if (arguments[i] && !isNaN(arguments[i])) numbers.push(arguments[i]); //If argument is a number, add it to the array
				}
				if (!numbers.length) mScript.error("math.average() requires at least one argument and only accepts numerical values."); //Else, throw a Error 
				for (i = 0; i < numbers.length; i++) {
					total += numbers[i]; //Update total
				}
				return total / numbers.length; //Get final value and return it
			},
			mean: function(nums) { //Alias for average
				return mScript.math.average(nums);
			},
			range: function(nums) {
				var numbers = [], //Create an empty array
					i = 0;
				for (; i < arguments.length; i++) { //Get all arguments
					if (arguments[i] && !isNaN(arguments[i])) numbers.push(arguments[i]); //If argument is a number, add it to the array
					else mScript.error("math.range() requires at least one argument and only accepts numerical values."); //Else, throw a Error 
				}
				var max = Math.max.apply(null,numbers); //Apply Math methods to array
				var min = Math.min.apply(null,numbers);
				return max - min; //Get highest and lowest number and subtract them from each other
			},
			factorOf: function(factor,number) { //Check if factor is a factor of number
				return number % factor === 0;
			},
			isNumber: function(x) { //Check if a value is a number
				return !isNaN(y) && isFinite(y); //Return value
			},
			whole: function(x) { //Checks if x is a whole number
				return Math.round(x) === x;
			},
			decimal: function(x) { //Checks if a number isn't whole
				return Math.round(x) !== x;
			},
			median: function(nums) {
				var numbers = [], //Create an empty array
					i = 0,
					len = arguments.length;
				for (; i < len; i++) { //Get all arguments
					if (!isNaN(arguments[i])) numbers.push(arguments[i]); //If argument is a number, add it to the array
				}
				numbers.sort(function(a,b) { //Now sort the array (from least to greatest)
					return a-b;
				});
				len = numbers.length;
				if (len % 2 === 0) { //If array length is an even number
					while (numbers.length > 2) { //Loop through the elements
						numbers.shift(); //Remove first number
						numbers.pop(); //Remove last number
					}
					if (numbers.length === 2) return (numbers[0] + numbers[1]) / 2; //If length is two, return value
				} else { //If number is odd
					while (numbers.length !== 1) { //While the length of the array isn't equal to one
						if (numbers.length !== 1) numbers.shift(); //Remove first number; check each time to make sure that the length isn't 1
						if (numbers.length !== 1) numbers.pop(); //Remove last number
					}
					return numbers[0];
				}
			},
			prime: function(x) { //Check if number is prime
				if (x <= 1 || mScript.math.decimal(x) || x % 2 === 0) return false; //Zero, one, and non-whole numbers aren't prime; also, mScript protects browser from crashing!
				if (mScript.indexOf(primesNos,x) > -1) return true;
				//If x is less than the last listed number in primeNos (and we haven't returned by now), it's not prime
				if (x < primesNos[primeNos.length - 1]) return false;
				for (i = 109; i !== x; i++) { //If we've come this far, then the last number we've divided by is 107; next prime is 109
					if (x % i === 0) return false; //If there is no remainder, return false
				}
				return true; //If we haven't returned by now, our number is prime
			},
			composite: function(x) { //Check if number is composite
				if (x <= 1 || mScript.math.decimal(x)) return false; //Zero, one, and non-whole numbers  aren't composite
				return !mScript.math.prime(x);
			},
			max: function() { //Ignore NaN values
				var arr = [],
					i = 0,
					len = arguments.length;
				for (; i < len; i++) {
					if (!isNaN(arguments[i])) arr.push(arguments[i]);
				}
				return Math.max.apply(Math,arr);
			},
			min: function() { //Ignore NaN values
				var arr = [],
					i = 0,
					len = arguments.length;
				for (; i < len; i++) {
					if (!isNaN(arguments[i])) arr.push(arguments[i]);
				}
				return Math.min.apply(Math,arr);
			},
			factorial: function(x) { //Find the factorial of any number
				if (x < 0) mScript.error("math.factorial() called on negative number.");
				var total = x;
				while (--x) total *= x;
				return total;
			}
		},
		/* mScript.date
		 * Useful methods that have to do with timing and the Date object
		 * Call as $.date
		 */
		date: {
			/* Check elapsed time
			 * Either time a function
			 * Or get the difference between two dates
			 */
			elapsed: function(callback,date) {
				if (!callback) mScript.error(".date.elapsed() required at least one argument.");
				if (typeof callback === "function") {
					var then = new Date().getTime(),
						now;
					callback.call(window);
					now = new Date().getTime();
					return now - then;
				} else if (callback.getTime && date.getTime) return callback.getTime() - date.getTime();
				return 0;
			},
			/* Return a string day
			 * Using new Date().getDay()
			 * Allows use of own date object
			 */
			day: function(date) {
				return dateDays[date && date.getDay ? date.getDay() : new Date().getDay()];
			},
			/* Return a string month
			 * Using new Date().getMonth()
			 * Allows use of own object
			 */
			month: function(date) {
				return dateMonths[date && date.getMonth ? date.getMonth() : new Date().getMonth()];
			},
			/* Returns a simple string date
			 * Without including time zone
			 */
			string: function(date) {
				date = date && date.getDay ? date : new Date();
				return mScript.date.day(date) + ", " + date.getDate() + " " + mScript.date.month(date) + ", " + date.getFullYear();
			},
			get: function(date) {
				date = date && date.getDay ? date : new Date();
				return [mScript.date.day(date),date.getDate() + "",mScript.date.month(date),date.getFullYear() + ""];
			}
		},
		//Some helper methods
		isArray: Array.isArray || function(obj) { //Check if an object is an array
			return mScript.type(obj) === "array";
		},
		isFunction: function(funct) { //Check if we are working with a function
			return typeof funct === "function";
		},
		isObject: function(obj) { //Check if a value is an object
			return mScript.type(obj) === "object";
		},
		windowLoadState: 0 //Default value is 0
	});
	/* mScript.events's prototype
	 * To use, call new mScript.events
	 */
	mScript.events.prototype = {
		add: function(event,callback,node) {
			if (!this[event]) this[event] = [];
			var obj = {
				callback: callback,
				listenerCallback: function(event) {
					return callback.call(this,mScript.eventHolder(event));
				},
				to: node,
				IECallback: function() {
					return obj.callback.call(obj.to,mScript.eventHolder(window.event));
				}
			};
			this[event].push(obj);
		},
		get: function(event,callback,node,ie) {
			var ev,len,currEvent,
				i = 0;
			if (!event) {
				for (ev in this) {
					len = (curr = this[ev]).length;
					for (; i < len; i++) {
						if ((node ? curr[i].to === node : true) && (!callback || callback === curr[i].callback)) return ie ? curr[i].IECallback : curr[i].listenerCallback; 
					}
				}
				return function() {}; //Return an empty function to evade IE throwing errors
			}
			len = this[event].length;
			for (; i < len; i++) {
				currEvent = this[event][i];
				if ((!node || currEvent.to === node) && (!callback || callback === currEvent.callback)) return ie ? currEvent.IECallback : currEvent.listenerCallback; 
			}
		},
		/* The clean-up function of the object
		 * Called by .end()
		 * Removes all events
		 * Can be filtered by:
		 ** event type
		 ** callback
		 ** node
		 * Callback can be either the regular callback or the IE callback
		 */
		remove: function(ev,callback,node) {
			var event,len,currEvent,
				i = 0;
			//Resetting an event array
			if (ev && !callback && !node) this[ev] = [];
			else {
				for (event in this) {
					if (mScript.hasProp(this,event)) {
						len = this[event].length;
						for (; i < len; i++) {
							currEvent = this[event][i];
							if (currEvent && (!ev || ev === event) && (!callback || currEvent.callback === callback || currEvent.listenerCallback === callback || currEvent.IECallback === callback) && (!node || node === currEvent.to)) this[event].splice(i,1);
						}
					}
				}
			}
		},
		/* Get all callbacks in the object
		 * Can be filtered by:
		 ** event type
		 ** callback
		 ** node
		 * Can return either a callback for Internet Explorer
		 * Or callback for other browsers
		 */
		getAll: function(event,callback,node,ie) {
			var matched = [],
				i,ev,len,currEvent;
			for (ev in this) {
				if (mScript.hasProp(this,ev)) {
					len = this[ev].length;
					for (i = 0; i < len; i++) {
						currEvent = this[ev][i];
						if (currEvent && (!event || event === ev) && (!callback || callback === currEvent.callback) && (!node || node === currEvent.to)) matched.push({
							event: ev,
							node: currEvent.to,
							callback: ie ? currEvent.IECallback : currEvent.listenerCallback
						});
					}
				}
			}
			return matched;
		}
	};
	mScript.memoryHolder.prototype = { //The prototype for our $.memory() constructor
		done: function(callback) {
			var obj = this.object;
			if (callback === undefined) {
				var i = 0,
					events = this.object.ondone,
					len = events.length;
				for (; i < len; i++) events[i].call(this);
			} else if (typeof callback === "function") {
				if (!obj.ondone || !obj.ondone.push) obj.ondone = [];
				obj.ondone.push(callback);
			}
			return this;
		},
		fail: function(callback) {
			if (callback === undefined) {
				var i = 0,
					events = this.object.onfail,
					len = events.length;
				for (; i < len; i++) events[i].call(this);
			} else if (typeof callback === "function") {
				if (!obj.ondone || !obj.onfail.push) obj.onfail = [];
				obj.onfail.push(callback);
			}
			return this;
		},
		fired: function() { //Are object's methods fired?
			return !!this.object.fired;
		},
		get: function(prop) {
			return prop !== undefined ? this.object[prop] : this.object;
		},
		find: function(prop) {
			return mScript.memoryHolder(this.object[prop]);
		},
		fire: function(callback) {
			var prop,caught,args,
				obj = this.object;
			if (callback === undefined) {
				args = mScript.slice(arguments,0);
				if (!obj.frozen) {
					for (prop in obj) {
						if (mScript.hasProp(obj,prop) && typeof obj[prop] === "function") {
							try {
								obj[prop].call(args);
							} catch(e) {
								caught = true;
								if (!obj.fired) this.fail();
								throw e; //Rethrow exception
							}
						}
					}
					if (!caught && obj.fired) this.done();
					obj.fired = true; //We fire the functions
				}
			} else if (typeof callback === "function") {
				if (!obj.onfire || !obj.onfire.push) obj.onfire = [];
				obj.onfire.push(callback);
			} else if (callback === "fire" && obj.onfire && obj.onfire.length) {
				var i = 0,
					events = obj.onfire,
					len = events.length;
				for (; i < len; i++) obj.onfire[i].call(this);
			}
			return this;
		},
		freeze: function() { //Freeze object:
			this.object.frozen = true;
			return this;
		},
		unfreeze: function() {
			this.object.frozen = false;
			return this;
		},
		frozen: function() {
			return !!this.object.frozen;
		},
		/* .notFired()
		 * action: specifies the action to be executed:
		 ** "fire": this.fire(args)
		 ** "remove": this.remove(args)
		 ** custom function or array of functions: called with args
		 ** false: if is fired
		 * args: optional arguments for function(s)
		 * Any extra arguments are passed as function arguments
		 */
		notFired: function(action,args,_args) {
			var ifFired = !action,
				method,type;
			if (ifFired) { //Placement
				action = args;
				//.notFired() can be called:
				//.notFired(<action>,<function>,[<args>]);
				//or .notFired(<action>,<function>[,args1...,argsx])
				args = mScript.isArray(_args) ? _args : mScript.slice(arguments,2);
			} else if (arguments.length > 2) args = mScript.slice(arguments,1);
			if ((type = typeof action) === "string" && memoryInnerAction.test(action)) method = this[action];
			else if (type === "function") method = action;
			else if (type === "object" && action && action.length) method = function() {
				var i = 0,
					self = this,
					len = action.length;
				for (; i < len; i++) {
					if (typeof action[i] === "function") action[i].apply(self,args);
				}
			}; //Required semicolumn
			else mScript.error("Invalid action passed to .memory()'s .notFired().");
			if ((ifFired ? this.object.fired : !this.object.fired)) method.apply(this,args);
			return this;
		},
		/* .isFired()
		 * Same as calling .notFired(false,...)
		 */
		isFired: function() {
			var args = mScript.toArray(arguments);
			args.unshift(false);
			return this.notFired.apply(args);
		},
		add: function(obj,val) {
			var _obj = this.object,
				isObj = typeof obj === "object",
				args = isObj && mScript.toArray(arguments);
			if (args) args.unshift(obj);
			if (!_obj.frozen) args ? mScript.extend.apply(mScript,args) : (_obj[obj] = val);
			return this;
		},
		remove: function(prop) {
			var obj = this.object,
				args,
				i = 0,
				len = arguments.length;
			if (!obj.frozen) {
				if (arguments.length === 1) {
					try { //IE throws exceptions:
						obj[prop] = undefined;
						delete obj[prop];
					} catch(e) {}
				} else {
					args = mScript.toArray(arguments);
					for (; i < len; i++) {
						if (typeof args[i] === "string") {
							try { //IE throws exceptions:
								obj[args[i]] = undefined;
								delete obj[args[i]];
							} catch(e) {}
						}
					}
				}
			}
			return this;
		},
		/* .removeAll()
		 * Removes all properties from the object
		 */
		removeAll: function() {
			var obj = this.object,
				prop;
			if (!obj.frozen) {
				for (prop in obj) {
					if (mScript.hasProp(obj,prop)) {
						try { //IE throws exceptions:
							obj[prop] = undefined;
							delete obj[prop];
						} catch(e) {}
					}
				}
			}
			return this;
		},
		clearEvents: function() {
			var obj = this.object;
			try { //IE throws errors on delete
				obj.onfire = obj.ondone = obj.onfail = undefined;
				delete obj.onfire;
				delete obj.ondone;
				delete obj.onfail;
			} catch(e) {}
		},
		//Query events:
		event: function(event) {
			var prop = obj["on" + event];
			return (event === "fire" || event === "done" || event === "fail") && mScript.isArray(prop) ? obj[prop] : null;
		},
		/* .clone()
		 * Copies all properties from object
		 * To a new object
		 */
		clone: function() {
			return mScript.extend({},this.object);
		}
	};
	mScript.eventHolder.prototype = { //.eventHolder prototype
		preventDefault: function() {
			var e = this.event;
			if (!e) return;
			if (e.preventDefault) e.preventDefault(); //Non-IE
			else this.returnValue = e.returnValue = false; //IE
		},
		stopPropagation: function() {
			var e = this.event;
			this.isPropagationStopped = rTrue;
			if (!e) return;
			if (e.stopPropagation) e.stopPropagation(); //Non-IE
			e.cancelBubble = true; //IE
		},
		stopImmediatePropagation: function() {
			this.isImmediatePropagationStopped = rTrue;
			this.stopPropagation();
		},
		isDefaultPrevented: rFalse,
		isPropagationStopped: rFalse,
		isImmediatePropagationStopped: rFalse
	};
	//Set the prototype
	$wrap.prototype = mScript.core;
	$document = mScript(document); //Reference to $(document)
	$e = mScript.events(); //Reference to an mScript.events instance
	/*! mSelect v.1.2.1
	 * The mScript CSS Selector Engine
	 * By Matey Yanakiev
	 * Released under MIT License
	 * See license.txt for details
	 */
	(function(window,undefined) {
		var document = window.document, //Correctly namespaced document
			docElm = document.documentElement,
			mutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver, //Get supported mutation observer
			expando = "mSelect" + (new Date()), //Expando
			noop = function() {}, //A function that does nothing
			//We use mutation observers to detect changes to the DOM
			//We do not use mutation events
			addClearCache = mutationObserver ? function(elm) {
				var doc,_docElm;
				if ((doc = elm.ownerDocument || elm) && (_docElm = doc.documentElement)) {
					var callback = function() {
							var cached = _cache[indexOfContext(elm)];
							if (cached) cached.cached = {};
						},
						attrModified = new mutationObserver(callback);
					attrModified.observe(_docElm,{
						attributes: true,
						childList: true,
						characterData: true,
						subtree: true
					});
				}
			} : noop,
			//Caching for mSelect
			//_cache: main object; array
			//_cache[i]:
			//context: <node | array>
			//cached: all selections in that context; object
			_cache = [],
			addCache = mutationObserver ? function(selector,result,context) {
				var index = indexOfContext(context),
					cached;
				if (index > -1) {
					cached = _cache[index].cached;
					if (!cached[(selector += " ")]) cached[selector] = result;
					return;
				}
				_cache.push({
					context: context,
					cached: {}
				});
				_cache[_cache.length - 1].cached[selector] = result;
			} : noop,
			getCache = mutationObserver ? function(context) {
				var index = indexOfContext(context);
				return _cache[index] && _cache[index].cached || [];
			} : function() { //No caching:
				return [];
			},
			indexOfContext = mutationObserver ? function(context) {
				var i = 0,
					len = _cache.length;
				for (; i < len; i++) {
					if (_cache[i] && _cache[i].context === context) return i;
				}
				return -1;
			} : noop,
			/* getProtoOf()
			 * Low-level function to get prototype of object
			 * Used instead of .hasOwnProperty()
			 */
			getProtoOf = Object.getPrototypeOf || function(obj) {
				return obj.__proto__ || obj.constructor && obj.constructor.prototype;
			},
			//Getting attributes that are not
			//Properties of an element
			//Case-insensitive for HTML
			//Sensitive for XML
			//Note that this is only used on
			//HTML elements
			getUnknownAttr = function(element,name) {
				try { //IE decides to throw an error here
					var attr = element.attributes.getNamedItem(name);
					return attr ? (attr.nodeValue || null) : null;
				} catch(e) {}
			},
			attrFix = { //HTML attributes with special case:
				tabindex: "tabIndex",
				readonly: "readOnly",
				ismap: "isMap",
				maxlength: "maxLength",
				cellspacing: "cellSpacing",
				cellpadding: "cellPadding",
				rowspan: "rowSpan",
				colspan: "colSpan",
				usemap: "useMap",
				frameborder: "frameBorder",
				contenteditable: "contentEditable"
			},
			forAndClass = {
				"for": "htmlFor",
				"class": "className"
			},
			querySelectorRoot = document.querySelector && (function() { //querySelectorAll() returns incorrect elements
				var div = document.createElement("div"),
					p = document.createElement("p"),
					result;
				div.appendChild(p);
				div.firstChild.appendChild(document.createElement("span"));
				docElm.insertBefore(div,docElm.firstChild);
				result = !p.querySelectorAll("div span").length;
				docElm.removeChild(div);
				return result;
			})(),
			//IE 6, 7, and 8 considers all elements to have disabled === false
			specialElementsDisabled = (function() {
				var div = document.createElement("div"),
					result = typeof div.disabled !== "boolean";
				div = null; //Release memory
				return result;
			})(),
			noCommentsInAll = (function() { //Make sure that .getElementsByTagName("*") returns elements only
				var div = document.createElement("div"),
					result;
				div.appendChild(document.createComment(""));
				result = div.getElementsByTagName("*").length === 0;
				div = null; //Release memory
				return result; //Return result
			})(),
			usableGetByClass = (function() { //Can we use .getElementsByClassName()?
				var div = document.createElement("div"),
					divChild = document.createElement("div"),
					divChild2 = document.createElement("div"),
					result = !!div.getElementsByClassName;
				divChild.className = "test two";
				divChild2.className = "test";
				div.appendChild(divChild);
				div.appendChild(divChild2);
				if (result) {
					result = div.getElementsByClassName("two").length;
					//Safari 3.2 doesn't catch class changes
					divChild2.className = "two";
					result = result && div.getElementsByClassName("two").length === 2;
				}
				//Release memory:
				div = null;
				divChild = null;
				divChild2 = null;
				return result;
			})(),
			attrNotProp = (function() { //Does .getAttribute() return properties or attributes
				var div = document.createElement("div"),
					result;
				div.className = "class";
				result = typeof div.getAttribute !== "undefined" && div.getAttribute("class") === "class";
				div = null; //Release memory
				return result; //Return result
			})(),
			noBooleanAttr = (function() { //Make sure that .getAttribute() doesn't return boolean values
				var div = document.createElement("div"),
					select = document.createElement("select"),
					result;
				div.appendChild(select);
				result = typeof div.lastChild.getAttribute("multiple");
				div = select = null; //Release memory
				return result !== "string" && result !== "boolean"; //Return result
			})(),
			hrefNotNormalized = (function() {
				var div = document.createElement("div"),
					anchor = document.createElement("a"),
					result;
				anchor.href = "#";
				div.appendChild(anchor);
				result = typeof div.getAttribute !== "undefined" && div.getAttribute("href") === "#";
			})(),
			getHref = hrefNotNormalized ? function(elm) {
				return getAttr(elm,"href");
			} : function(elm) {
				return !isXML(elm) ? elm.getAttribute("href",2) : getAttr(elm,"href");
			},
			boolAttr = /^(?:checked|selected|disabled|readonly|multiple|is[mM]ap|defer|no[rR]esize|async)$/,
			filterBool = noBooleanAttr ? function(val) {
				return val || null;
			} : function(val,orig) {
				//If we are working with a boolean attribute, filter it
				if (boolAttr.test(orig)) return val === true ? orig : null;
				return val || null;
			},
			getAttr = function(element,attr) { //Safe way to get an element property
				attr = attr.toLowerCase(); //Case-insensitivity
				if (!isXML(element)) { //HTML elements:
					if (element.getAttribute && attrNotProp) {
						//For attribute fixes
						attr = attrFix[attr] || attr;
						//Second argument === case-insensitivity in IE
						//We are returning the cssText without .getAttribute(), as that is the easiest way
						return filterBool(attr === "style" ? element.style.cssText : element.getAttribute(attr,0),attr);
					} else {
						//For attribute problems
						attr = attrFix[attr] || forAndClass[attr] || attr;
						//Handle style differently
						return filterBool(attr === "style" ? element.style.cssText : attr !== "value" && typeof element[attr] !== "undefined" ? element[attr] : getUnknownAttr(element,attr),attr);
					}
				} else { //XML elements
					var attrs = element.attributes,
						currAttr,
						i = 0,
						len = attrs.length;
					//We attributes them differently:
					if (attrs) {
						for (; i < len; i++) {
							if ((currAttr = attrs[i]).nodeName.toLowerCase() === attr) return currAttr.nodeValue;
						}
					}
					return null;
				}
			},
			disconnectedElementIs = function(selector,elm) {
				var div = elm.ownerDocument.createElement("div"),
					newelm = elm.cloneNode(true);
				if (!newelm) return false;
				div.appendChild(newelm);
				return mSelect.is(selector,newelm);
			},
			getAll = noCommentsInAll ? function(context) {
				//Turn node list into array
				return toArray(context.getElementsByTagName("*"));
			} : function(context) {
				var all = context.getElementsByTagName("*"),
					i = 0,
					len = all.length,
					results = [];
				for (; i < len; i++) {
					if (all[i].nodeType === 1) results.push(all[i]);
				}
				return results;
			},
			/* getInnerText()
			 * Getting innerText/textContent by getting childrens' node values
			 * Inspired by Sizzle
			 */
			getInnerText = function(elm) {
				var txt = "",
					nType = elm && elm.nodeType;
				if (nType === 1 || nType === 9 || nType === 11) {
					//.innerText ignores some characters
					if (typeof elm.textContent === "string") return elm.textContent;
					for (elm = elm.firstChild; elm; elm = elm.nextSibling) {
						txt += getInnerText(elm) || "";
					}
					return txt;
				}
				if (nType === 3 || nType === 4) return elm.nodeValue; //Text and CDATA nodes
			},
			id = /#((?:\\.|[-\w]|[^\x00-\xa0])+)/, //Matches IDs
			Class = /\.((?:\\.|[-\w]|[^\x00-\xa0])+)/, //Matches classes
			attr = /\[((?:\\.|[-\w]|[^\x00-\xa0])+)(?:((?:[~\|!\*\^\$])?=)["']?((?:\\.|[-\w#,]|[^\x00-\xa0]|[\s\f\t\r\n\x20])*)?["']?)?\]/m, //Matches attributes: [attr=val] (or other operators) and just [attr]
			//Matches attributes with commas, spaces, >, +, and/or ~
			//Used for escaping
			attrNeedEscape = /\[(?:(?:\\.|[-\w]|[^\x00-\xa0])+[!\|\*\^\$]?=["']?(?:(?:[~\+>\s\f\t\r\n\x20,](?:\\.|[-\w#]|[^\x00-\xa0])?|(?:\\.|[-\w#]|[^\x00-\xa0])?[~\+>\s\f\t\r\n\x20,])+)["']?|(?:\\.|[-\w]|[^\x00-\xa0])+~=["']?(?:(?:\\.|[-\w#]|[^\x00-\xa0])+)?["']?)\]/gm,
			//Pseudos with arguments:
			argumentPseudo = /:((?:\\.|[-\w]|[^\x00-\xa0])+)(?:\((?:['"]?((?:\\.|[^\\])+?)\2|([^()[\]]+|(?:(?:\[[\s\f\t\r\n\x20]*((?:\\.|[-\w]|[^\x00-\xa0])+)[\s\f\t\r\n\x20]*(?:([*^$|!~]?=)[\s\f\t\r\n\x20]*(?:['"]?((?:\\.|[^\\])*?)\3|((?:\\.|[-\w#]|[^\x00-\xa0])+)))[\s\f\t\r\n\x20]*\])|[^:]|\\.)+|.+))\))/gm,
			tag = /((?:\\.|[-\w\*]|[^\x00-\xa0])+)/, //Tag names; we also match *
			simple = /^(?:(#|\.)?[\s\f\t\r\n\x20]*((?:\\.|[-\w]|[^\x00-\xa0])+)[\s\f\t\r\n\x20]*)$/m, //Simple expressions: tags, IDs, and classes
			plusAndSpace = /[\s\f\t\r\n\x20]*\+[\s\f\t\r\n\x20]*/gm, //+ and spaces around it
			lineAndSpace = /[\s\f\t\r\n\x20]*~[\s\f\t\r\n\x20]*/gm, //~ and spaces around it
			gtAndSpace = /[\s\f\t\r\n\x20]*>[\s\f\t\r\n\x20]*/gm, //> and spaces around it
			seperatorSpace = /[\s\f\t\r\n\x20]+/gm, //Seperator space; trim it
			anchor = /^#/, //Anchor links
			whitespace = /[\s\f\t\r\n\x20]/gm, //Used to replace all non-\s spaces to spaces
			secondQuery = /^(?:not|contains|matches)$/, //Match selectors that require a second query
			needsArray = /^(?:gt|lt|get|first|last|only)$/, //Pseudos that require an array to work
			matchSavedPseudo = /@pseudoargs@/, //Match safed pseudos
			inputButton = /^(?:input|button)$/, //Match <input> and <button>
			inputs = /^(?:input|button|select|textarea)$/i, //Test for input elements
			canDisable = /^(?:input|button|style|link|select|option|textarea)$/i, //Elements that can be disabled and should work with :disabled/:enabled
			headings = /^(?:h[1-6])$/i, //Heading elements
			startAndEndSpace = /^[\s\f\t\r\n\x20]+|[\s\f\t\r\n\x20]+$/g, //Matches leading and ending spaces
			spacesAroundCommas = /[\s\f\t\r\n\x20]*,[\s\f\t\r\n\x20]*/g, //Matches spaces around commas, so that they can be removed
			escapedComma = /\^\$c\$\^/g, //Match espaced commas
			escapedSpace = /\^\$s\$\^/g, //Match escaped spaces
			escapedLine = /\^\$line\$\^/g, //Match escaped ~
			escapedPlus = /\^\$plus\$\^/g, //Match escaped +
			escapedGt = /\^\$gt\$\^/g, //Match escaped >
			escapedNewLine = /\^\$new\$\^/g, //Match escaped \n
			escapedReturn = /\^\$return\$\^/g, //Match escaped \r
			escapedTab = /\^\$tab\$\^/g, //Match escaped \t
			escapedNBSP = /\^\$nbsp\$\^/g, //Match escaped nbsp
			quotesStart = /^["']/, //Starting quotes
			quotesEnd = /["']$/, //Ending quotes
			eventPseudos = /^:(?:active|hover|focus)|[^\\]:(?:active|hover|focus)/, //Match pseudos that have values that can't be cached
			nthWords = /nth\-(of\-type|child)\((even|odd|last|first)\)/, //Match nth- selectors with words
			spaceEscape = /\/\?&\?\?&\?\//g, //Space escape pattern
			plusEscape = /\{\?\&\?\?\?\&\?\}/g, //+ escape pattern
			lineEscape = /<\?\&\?\?\?\?\&\?</g, //~ espace pattern
			gtEscape = /@\?\&\?\?\?\?\?\&\?@/g, //> espace pattern
			allSeperators = "^(?:" + spaceEscape.source + "|" + plusEscape.source + "|" + lineEscape.source + "|" + gtEscape.source + ")?",
			//Pseudo RegExp based on Sizzle's
			//Many thanks!
			//Note we match escaped seperators so that we match selectors
			//In the order in which they were written
			pseudo = new RegExp(allSeperators + "(:((?:\\\\.|[-\\w]|[^\\x00-\\xa0])+)(?:\\((?:['\"]?((?:\\\\.|[^\\\\])*?)\\3|([^()[\\]]*|(?:(?:\\[[\\s\\f\\t\\r\\n\\x20]*((?:\\\\.|[-\\w]|[^\\x00-\\xa0])+)[\\s\\f\\t\\r\\n\\x20]*(?:([*^$|!~]?=)\\s*(?:['\"]?((?:\\\\.|[^\\\\])*?)\\4|((?:\\\\.|[-\\w#]|[^\\x00-\\xa0])+)|)|)[\\s\\f\\t\\r\\n\\x20]*\\])|[^:]|\\\\.)*|.*))\\)|))","m"),
			//If ever needed, RegExp to match all seperators:
			//escapedSeperator = new RegExp("(" + spaceEscape.source + "|" + plusEscape.source + "|" + lineEscape.source + "|" + gtEscape.source + ")"),
			commas = /,/g, //Match commas
			//We escape the following in attributes:
			toEscapeGt = />/gm,
			toEscapePlus = /\+/gm,
			toEscapeLine = /~/gm,
			toEscapeSpace = /\s/gm,
			toEscapeNewLine = /\n/gm,
			toEscapeReturn = /\r/gm,
			toEscapeFeed = /\f/gm,
			toEscapeTab = /\t/gm,
			toEscapeNBSP = /\x20/gm,
			escapeAttrs = function(str) { //Escape spaces, commas, and sibling/children selectors in attrs
				var match,len,
					i = 0;
				if ((match = str.match(attrNeedEscape))) {
					len = match.length;
					for (; i < len; i++) {
						//Space goes last, because \s may match other space characters
						str = str.replace(match[i],match[i].replace(commas,"^$c$^").replace(toEscapeGt,"^$gt$^").replace(toEscapePlus,"^$plus$^").replace(toEscapeLine,"^$line$^").replace(toEscapeNewLine,"^$new$^").replace(toEscapeReturn,"^$return$^").replace(toEscapeFeed,"^$feed$^").replace(toEscapeTab,"^$tab$^").replace(toEscapeNBSP,"^$nbsp$^").replace(toEscapeSpace,"^$s$^"));
					}
				}
				return str;
			},
			unescapeAttrs = function(str) {
				return str.replace(escapedComma,",").replace(escapedLine,"~").replace(escapedPlus,"+").replace(escapedGt,">").replace(escapedNewLine,"\n").replace(escapedReturn,"\r").replace(escapedTab,"\t").replace(escapedNBSP,"\x20").replace(escapedSpace," ");
			},
			/* Unescaping characters for CSS selector engine
			 * Characters are escaped with "\\"
			 */
			rescape = /\\(?!\\)/g, //Match \\ globally
			/* mSelect nth- math parser
			 * Accepts a string with a simple mathematical expression
			 * Currently, doesn't follow PEMDAS rules
			 */
			digit = /^([\+\-]?(?:[\d\.](?:[eE][\+-][\d\.])?)+)$/, //Match a digit
			words = /(^\-{1,2})?[^\d\-\+\*\/\.]/g, //Match non-digit
			invalidMath = /[^\d\-\+\*\/\.\w]/, //Invalid math expressions
			mathExpression = /([\+\-]?(?:[\d\.]+))?([\+\-\*\/]){0,2}([\d\.]+)/, //Match a math expression
			twoNegative = /^-(?:-)?/,
			initAndEndMultiply = /^\*|\*$/g,
			moreMultiply = /\*{2,}/g,
			fixMultiply = /\*(?=[\-\+\/])/g,
			parseMath = function(str,i) {
				if (invalidMath.test(str)) error("Invalid characters in math expression: " + str);
				var match,num1,num2,strmatch,operator,
					oldstr = str, //For errors
					val = 0;
				strmatch = str.match(words);
				//Negative x (-x)
				if (strmatch && twoNegative.test(strmatch[0])) i = "-" + i;
				str = str.replace(words,"(" + i + ")").replace(new RegExp("(?=[^\\+\\-\\*\\/]?)\\(" + i + "\\)(?=[^\\+\\-\\*\\/]?)","g"),"*" + i + "*").replace(initAndEndMultiply,"").replace(moreMultiply,"*").replace(fixMultiply,"");
				while (!digit.test(str)) {
					match = str.match(mathExpression);
					if (!match || !match[1] || !match[3]) error("Invalid math string: " + oldstr);
					operator = ((operator = match[2]) && operator.length === 2 ? operator.charAt(0) : operator) || "*";
					if (isNaN(num1 = parseFloat(match[1]))) error("Invalid number: " + match[1]);
					if (isNaN(num2 = parseFloat(match[3]))) error("Invalid number: " + match[3]);
					switch(operator) {
						case "*":
							val = num1 * num2;
							break;
						case "/": 
							val = num1 / num2;
							break;
						case "+":
							val = num1 + num2;
							break;
						case "-": 
							val = num1 - num2;
							break;
					}
					str = str.replace(match[0],val + "");
				}
				return str;
			},
			//Also returns false for XML elements appended in the HTML document
			//XML elements have no style property (object)
			//Works for HTML document, as its documentElement has style property
			isXML = function(elm) {
				return !(elm.documentElement || elm).style;
			},
			//1: attr
			//2: tag
			//3: class
			//4: id
			matchExpression = new RegExp("(?:" + attr.source + "|" + tag.source + "|" + Class.source + "|" + id.source + ")"),
			error = function(str) { //Error template:
				throw new Error("mSelect: " + str);
			},
			filterUnique = function(arr) { //Filter for unique elements
				var results = [],
					i = 0,
					len = arr.length;
				for (; i < len; i++) {
					if (indexOf.call(results,arr[i]) === -1) results.push(arr[i]);
				}
				return results;
			},
			slice = Array.prototype.slice,
			indexOf = [].indexOf || function(node) { //Safe indexOf()
				var i = 0,
					len = this.length;
				for (; i < len; i++) {
					if (this[i] === node) return i;
				}
				return -1;
			},
			toArray = function(arr) { //Quick toArray() method
				return slice.call(arr,0); //Use safe slice
			},
			prevElmSibling = function(elm) { //Fetch previous element sibling
				var node;
				if (typeof (node = elm.previousElementSibling) !== "undefined") return node;
				while ((elm = elm.previousSibling)) {
					if (elm.nodeType === 1) return elm;
				}
				return null;
			},
			/* createInputPseudo()
			 * Quick way to create input elements
			 * Compares attributes (optional)
			 * And matches elements against function (optional)
			 */
			createInputPseudo = function(name,val) {
				var regExp = !!name.test;
				return function(elm) {
					var nodeName = elm.nodeName.toLowerCase();
					return (regExp ? name.test(nodeName) : name === nodeName) && elm.getAttribute("type") === val;
				};
			},
			children = function(elm) { //Get children
				//Where elm.children is defined, it's a node list (not null/falsy)
				if (elm.children) return elm.children;
				var arr = [],
					i = 0,
					kids = elm.childNodes,
					len = kids.length;
				for (; i < len; i++) {
					if (kids[i].nodeType === 1) arr.push(kids[i]);
				}
				return arr;
			},
			//a === attribute name
			//c === operator
			//b === value to compare
			compareAttr = function(a,c,b,elm) { //Compare attributes
				var index;
				b = b || "";
				a = getAttr(elm,a);
				if (a === null) return c === "!=";
				if (!c) return true;
				return c === "=" ? a === b
					: c === "!=" ? a !== b
					: c === "~=" ? b && (" " + a + " ").indexOf(" " + b + " ") > -1
					: c === "|=" ? b && ("-" + a + "-").indexOf("-" + b + "-") > -1
					: (index = a.indexOf(b)) > -1 ?
						c === "*=" ? true
						: c === "^=" ? index === 0
						: c === "$=" ? b && index === (a.length - b.length)
						: false
					: false;
			},
			/* contains(a,b)
			 * Does element a contains element b?
			 * We don't use native .contains(), because:
			 ** Some browsers don't have document.contains()
			 ** Some browsers don't have .contains() for XML elements
			 * All in all, isXML() checks, etc. take longer
			 */
			contains = function(parent,elm) {
				for (elm = elm.parentNode; elm; elm = elm.parentNode) {
					if (elm === parent) return true;
				}
				return false;
			},
			createPositionPseudo = function(type) {
				return function(elm) {
					while ((elm = elm[type])) {
						if (elm.nodeType === 1) return false;
					}
					return true;
				};
			},
			/* docOrder
			 * Passed to .sort(docOrder)
			 * Sorts array of elements based on their
			 * Indexes in their document(s)
			 */
			docOrder = docElm.compareDocumentPosition ? function(a,b) {
				var adoc = a.ownerDocument,
					bdoc = b.ownerDocument,
					binDoc = contains(bdoc,b),
					ainDoc;
				if (!binDoc) return -1;
				if (adoc !== bdoc) {
					ainDoc = contains(adoc,a);
					//Disconnected nodes go last
					if (!ainDoc) return 1;
					//We can't sort elements in different documents
					//HTML document gets precedence
					return bdoc === document ? 1 : -1;
				}
				return a.compareDocumentPosition && a.compareDocumentPosition(b) & 4 ? -1 : 1;
			} : function(a,b) {
				var adoc = a.ownerDocument,
					bdoc = b.ownerDocument,
					binDoc = contains(bdoc,b),
					ainDoc,asource,bsource;
				if (!binDoc) return -1;
				if (adoc !== bdoc) {
					ainDoc = contains(adoc,a);
					//Disconnected nodes go last
					if (!ainDoc) return 1;
					//We can't sort elements in different documents
					//HTML document gets precedence
					return bdoc === document ? 1 : -1;
				}
				//sourceIndex in IE:
				if ((asource = a.sourceIndex) && (bsource = b.sourceIndex)) return bsource > asource ? -1 : 1;
				for (; a; a = a.nextSibling) {
					if (a === b) return -1;
				}
				return 1;
			},
			/* nth-child and nth-last-child
			 * Used to create nth-child pseudos
			 * last: if the function is for nth-last-child
			 */
			nthChild = function(last) {
				var name = "nth" + (last ? "-last" : "") + "-child",
					nextPrev = (last ? "previous" : "next") + "Sibling",
					dir = (last ? "last" : "first") + "Child";
				return function(elm,sel) {
					if (!sel) error(name + " called without an argument."); //Requires argument
					var parent = elm.parentNode,
						i = 0,
						ii = 0,
						arr = [0], //No element can be at 0 and we need it in our array to speed up process
						node = parent[dir],
						seldigit;
					//Roots shouldn't return true
					//Disconnected nodes shouldn't either
					if (!parent || parent.nodeType !== 1) return false;
					//Similar to Sizzle's implementation:
					//Loop through elements and end looping when you spot element (if so)
					for (; node; node = node[nextPrev]) {
						if (node.nodeType === 1) {
							++i;
							if (node === elm) break;
						}
					}
					if (digit.test(sel)) seldigit = true;
					else {
						for (; arr[i] < ii; i++) arr.push(parseFloat(parseMath(sel,i)));
					}
					return seldigit ? i === parseFloat(sel) : indexOf.call(arr,i) > -1;
				};
			},
			/* nth-of-type and nth-last-of-type
			 * Created with this function
			 * last: whether the function is -last-of-type
			 */
			nthOfType = function(last) {
				var dir = (last ? "last" : "first") + "Child",
					nextPrev = (last ? "previous" : "next") + "Sibling",
					name = "nth" + (last ? "-last" : "") + "-of-type";
				return function(elm,sel) {
					if (!sel) error(name + " called without an argument."); //Requires argument
					var seldigit,
						parent = elm.parentNode,
						i = 0,
						ii = 0,
						array = [0], //No element can be at 0 and we need it in our array to speed up process
						nodeName = elm.nodeName,
						node = parent[dir];
					//Roots don't return true
					//Disconnected nodes shouldn't either
					if (!parent || parent.nodeType !== 1) return false;
					if (sel === "first") sel = "1";
					for (; node; node = node[nextPrev]) {
						if (node.nodeType === 1 && node.nodeName === nodeName) {
							++ii;
							if (node === elm) break;
						}
					}
					if (digit.test(sel)) seldigit = true;
					else {
						for (; array[i] < ii; i++) array.push(parseFloat(parseMath(sel,i)));
					}
					return seldigit ? ii === parseFloat(sel) : indexOf.call(array,ii) !== -1;
				}
			},
			/* Matching CSS selector seperators
			 * Loop through them like with pseudos
			 * +, ~, >, " "
			 */
			seperator = {
				"+": function(elm,sibling) {
					return prevElmSibling(elm) === sibling;
				},
				"~": function(elm,sibling) {
					for (var node = elm.previousSibling; node; node = node.previousSibling) {
						if (node === sibling) return true;
					}
					return false;
				},
				">": function(elm,parent) {
					return elm.parentNode === parent;
				},
				" ": function(elm,parent) {
					return contains(parent,elm);
				}
			},
			pseudos = {
				/* :contains()
				 * Check if elements contains text
				 * Or if an element contains
				 * Another element
				 */
				contains: function(elm,child,string) {
					if (string) return (elm.textContent || elm.innerText || getInnerText(elm) || "").indexOf(child) > -1;
					var i = 0,
						len = child.length;
					for (; i < len; i++) {
						if (child[i] && contains(elm,child[i])) return true;
					}
					return false;
				},
				/* :icontains()
				 * Check if an element
				 * Contains text
				 * Does case-insensitive search
				 * Does NOT find elements
				 */
				icontains: function(elm,str) {
					if (typeof str !== "string") error("icontains requires argument.");
					return (elm.textContent || elm.innerText || getInnerText(elm) || "").toLowerCase().indexOf(str.toLowerCase()) > -1;
				},
				/* CSS4 selector :matches()
				 * Returns true if element is any of its arguments
				 * e:matches(.a,.b) returns true if e has a class of a or b
				 */
				matches: function(elm,selector) {
					return indexOf.call(selector,elm) > -1;
				},
				/* :even and :odd
				 * Select elements based on their index
				 * In the array of their parents' children
				 * Limited to elements only
				 */
				even: function(elm) {
					var parent = elm.parentNode;
					return parent && indexOf.call(children(parent),elm) % 2 === 0;
				},
				odd: function(elm) {
					var parent = elm.parentNode;
					return parent && indexOf.call(children(parent),elm) % 2 !== 0
				},
				"nth-child": nthChild(),
				"nth-last-child": nthChild(true),
				"nth-of-type": nthOfType(),
				"nth-last-of-type": nthOfType(true),
				"only-of-type": function(elm,arr) {
					var parent = elm.parentNode,
						node = parent.firstChild;
					//Roots should return false
					//So should disconnected nodes
					if (!parent || parent.nodeType !== 1) return false;
					for (; node; node = node.nextSibling) {
						if (node.nodeType === 1 && node.nodeName === elm.nodeName && node !== elm) return false;
					}
					return true;
				},
				"first-of-type": function(elm) {
					return pseudos["nth-of-type"](elm,"1");
				},
				/* last-of-type
				 * We use a shorter code
				 */
				"last-of-type": function(elm) {
					var i = 0,
						parent = elm.parentNode,
						index,node;
					if (!parent || parent.nodeType !== 1) return false;
					for (node = parent.firstChild; node; node = node.nextSibling) {
						if (node.nodeType === 1 && node.nodeName === elm.nodeName) {
							++i;
							if (node === elm) index = i;
						}
					}
					return index === i;
				},
				not: function(elm,selector) {
					return indexOf.call(selector,elm) === -1;
				},
				empty: function(elm) {
					var nType;
					for (elm = elm.firstChild; elm; elm = elm.nextSibling) {
						nType = elm.nodeType;
						//Use of Diego Perini shortcut for nodeName
						if (elm.nodeName > "@" || nType === 3 || nType === 4) return false;
					}
					return true;
				},
				parent: function(elm) {
					return !pseudos.empty(elm);
				},
				/* :target
				 * Selects elements with id === #id portion of href
				 */
				target: function(elm) {
					var hash;
					return elm.ownerDocument === document && (hash = (window.location || {}).hash) && elm.id === hash.slice(1);
				},
				//<input type="text" /> and <textarea />
				text: function(elm) {
					var nodeName = elm.nodeName.toLowerCase();
					return nodeName === "textarea" || (nodeName === "input" && (elm.getAttribute ? elm.getAttribute("type") === "text" : false));
				},
				checkbox: createInputPseudo("input","checkbox"),
				file: createInputPseudo("input","file"),
				password: createInputPseudo("input","password"),
				submit: createInputPseudo(inputButton,"submit"),
				reset: createInputPseudo(inputButton,"reset"),
				image: function(elm) {
					var nodeName = elm.nodeName.toLowerCase();
					return (nodeName === "input" && elm.type === "image") || nodeName === "img";
				},
				button: function(elm) { //Buttons that are inputs or buttons
					var nodeName = elm.nodeName.toLowerCase();
					return (nodeName === "input" && elm.type === "button") || nodeName === "button";
				},
				root: function(elm) {
					return elm.ownerDocument.documentElement === elm;
				},
				first: function(elm,arr) {
					return arr[0] === elm;
				},
				last: function(elm,arr) {
					return arr[arr.length - 1] === elm;
				},
				only: function(elm,arr) {
					return arr.length === 1 && arr[0] === elm;
				},
				anchor: function(elm) { //Get <a /> elements that refer to positions on the page
					var href = getHref(elm);
					return href && elm.nodeName.toLowerCase() === "a" && anchor.test(href);
				},
				/* Handle W3C defined methods
				 * That are the same as other methods
				 */
				"first-child": createPositionPseudo("previousSibling"),
				"last-child": createPositionPseudo("nextSibling"),
				"only-child": function(elm) {
					var kids = children(elm);
					return kids.length === 1 && kids[0] === elm;
				},
				selected: function(elm) {
					//From Sizzle: Makes selected-by-default <option>s work in Safari
					if (elm.parentNode) elm.parentNode.selectedIndex;
					return elm.selected === true;
				},
				//Similar to Sizzle's:
				checked: function(elm) {
					var tag = elm.nodeName.toLowerCase();
					return (tag === "input" && !!elm.checked) || (tag === "option" && !!elm.selected);
				},
				readonly: function(elm) {
					return getAttr(elm,"readonly") === "readonly";
				},
				input: function(elm) { //All input-related elements
					return inputs.test(elm.nodeName);
				},
				header: function(elm) {
					return headings.test(elm.nodeName);
				},
				disabled: specialElementsDisabled ? function(elm) {
					return elm.disabled === true;
				} : function(elm) {
					return canDisable.test(elm.nodeName) && elm.disabled === true;
				},
				enabled: specialElementsDisabled ? function(elm) {
					return elm.disabled === false;
				} : function(elm) {
					return canDisable.test(elm.nodeName) && elm.disabled === false;
				},
				//Inspired by Sizzle
				//By John Resig and others
				focus: function(elm) {
					var ownDoc;
					return (ownDoc = elm.ownerDocument) && elm === ownDoc.activeElement && (!ownDoc.hasFocus || ownDoc.hasFocus()) && !!(elm.type || elm.href || ~elm.tabIndex);
				},
				active: function(elm) {
					var ownDoc;
					return (ownDoc = elm.ownerDocument) && elm === ownDoc.activeElement;
				},
				/* :visible and :hidden
				 * Return true if element's display property
				 * Is "none"
				 * Shortcut for <input type="hidden" /> used
				 */
				visible: function(elm) {
					var style;
					return elm.type !== "hidden" && (style = elm.style) && style.display !== "none";
				},
				hidden: function(elm) {
					var style;
					return elm.type === "hidden" || (style = elm.style) && style.display === "none";
				},
				/* :lang()
				 * Matches like [lang|=val]
				 * But matches children of element as well
				 * Like [lang|=val] *
				 */
				lang: function(elm,val) {
					//XML elements can also have xml:lang
					for (; elm; elm = elm.parentNode) {
						if ((isXML(elm) ? compareAttr("xml:lang","|=",val,elm) : false) || compareAttr("lang","|=",val,elm)) return true;
					}
					return false;
				},
				/* :get(), :lt(), and :gt()
				 * Use array and index to match elements
				 * Allow negative indexes
				 */
				get: function(elm,arr,i) {
					//Handle negative indexes
					return elm === arr[(i < 0 ? i + arr.length : i)];
				},
				gt: function(elm,arr,i) {
					return indexOf.call(arr,elm) > (i < 0 ? i + arr.length : i);
				},
				lt: function(elm,arr,i) {
					return indexOf.call(arr,elm) < (i < 0 ? i + arr.length : i);
				},
				/* Custom pseudos that determine whether
				 * we are working with HTML or XML elements
				 */
				html: function(elm) {
					return !isXML(elm);
				},
				xml: isXML
			},
			/* Filtering objects for mSelect
			 * Filter based on:
			 * Tag, ID, Class, etc.
			 */
			filter = { //Each function accepts an array
				tag: function(tag,context) { //Tags:
					return tag === "*" ? getAll(context) : toArray(context.getElementsByTagName(tag));
				},
				"#": function(id,context) { //IDs:
					var arr = getAll(context),
						i = 0,
						len = arr.length;
					for (; i < len; i++) {
						if (arr[i].id === id) return [arr[i]]; //There can only be one element with the same ID
					}
					return [];
				},
				".": usableGetByClass ? function(className,context) { //Classes:
					return toArray(context.getElementsByClassName(className));
				} : function(className,context) { //We can just use custom filter here:
					return useCustomFilter("class",className,getAll(context));
				}
			},
			//Function that returns true:
			returnTrue = function() {
				return true;
			},
			customFilter = {
				tag: function(name) {
					return name === "*" ? returnTrue : function(elm) {
						return elm.nodeName.toLowerCase() === name;
					};
				},
				"class": function(className) {
					className = " " + className + " ";
					return function(elm) {
						var _class = elm.className;
						return _class && (" " + _class + " ").indexOf(className) > -1;
					};
				}
			},
			//Selectors like :not(a)* will return * and not *:not(a) without a custom filter
			useCustomFilter = function(type,val,arr) {
				var method = customFilter[type](val),
					results = [],
					len = arr.length,
					i = 0;
				for (; i < len; i++) {
					if (method(arr[i])) results.push(arr[i]);
				}
				return results;
			},
			query = function(selector,core) {
				if (!selector) return [];
				core = core || document;
				//Speed up simple selectors
				//Doesn't work with classes for XML documents
				var matchSimple,simpleType,_sel;
				if ((matchSimple = selector.match(simple)) && ((simpleType = matchSimple[1] || "tag") === "." ? !isXML(core) : true)) {
					_sel = matchSimple[2].replace(rescape,""); //Unescape the selector
					//All elements (*) + core === _core
					//simpleType === ".", "#", or "tag"
					//_sel === tag name, class, or ID (unescaped)
					return filter[simpleType](_sel,core);
				}
				//Allow selectors like:  div:not(.class) , p (notice spaces)
				selector = selector.replace(startAndEndSpace,"");
				var nthmatch,pseudoMatches,currMatch,selectors,sel,all,ii,iii,nthval,len,_split,set,results,slen,rlength,match,old,_i,current,pname,pargs,_name,array,olength,arr,isQuoted,needsSecondQuery,containsStr,queried,args,arglen,attr,
					safedPseudos = [],
					i = 0,
					allResults = [],
					isPseudo = false; //Are we working with a pseudo?
				while ((nthmatch = selector.match(nthWords))) { //Caching purposes + support
					if ((nthval = nthmatch[2]) !== "last") selector = selector.replace(nthmatch[0],"nth-" + nthmatch[1] + "(" + (nthval === "even" ? "2n" : nthval === "odd" ? "2n-1" : nthval === "first" ? "1" : "") + ")");
					else selector = selector.replace(nthmatch[0],"last-" + nthmatch[1]);
				}
				/* Allow complex pseudos:
				 * Replace all complex pseudos (:pseudo(:pseudo2(),:pseudo3,...))
				 * So that we can safely split
				 * Then place pseudos back
				 */
				if ((pseudoMatches = selector.match(argumentPseudo))) { //Only match pseudos with arguments
					len = pseudoMatches.length;
					for (; i < len; i++) { //Complex pseudos only:
						//Save selector
						safedPseudos.push(currMatch = pseudoMatches[i]);
						selector = selector.replace(currMatch,"@pseudoargs@"); //Replace selector in string
					}
				}
				//We will split where we find the string $split$
				selectors = escapeAttrs(selector).replace(spacesAroundCommas,",").replace(plusAndSpace,"$split${?&???&?}").replace(lineAndSpace,"$split$<?&????&?<").replace(gtAndSpace,"$split$@?&?????&?@").replace(seperatorSpace,"$split$/?&??&?/").split(",");
				len = selectors.length;
				for (i = 0; i < len; i++) {
					_split = (sel = selectors[i] ? unescapeAttrs(selectors[i]) : "").split("$split$");
					set = 0;
					results = [];
					slen = _split.length;
					//We do this after to allow complex pseudos, such as: :not(a > b)
					for (ii = 0; ii < safedPseudos.length && matchSavedPseudo.test(sel); ii++) {
						for (iii = 0; iii < slen; iii++) _split[iii] = _split[iii].replace(matchSavedPseudo,safedPseudos[ii]);
					}
					for (_i = 0; _i < slen; _i++) {
						results = [];
						sel = _split[_i];
						//isPseudo is true if we are working with a pseudo
						while (sel && (match = sel.match(pseudo)) ? (isPseudo = true) : (match = sel.match(matchExpression))) {
							rlength = results.length;
							//Pseudos:
							if (isPseudo && (pname = match[2].replace(rescape,""))) { //Pseudos:
								//pname === match[2]
								//pargs === match[4]
								pargs = match[4];
								//Case-insensitive
								//(100% if registered lowercase)
								if (!pseudos[pname] && !pseudos[(pname = pname.toLowerCase())]) error("Unsupported pseudo: " + pname);
								results = rlength ? results : getAll(core);
								rlength = results.length; //Update length
								arr = [];
								isQuoted = pargs && quotesStart.test(pargs) && quotesEnd.test(pargs);
								needsSecondQuery = secondQuery.test(pname);
								containsStr = pname === "contains" && isQuoted;
								queried = [];
								args = [];
								arglen;
								if (isQuoted) pargs = pargs.substring(1,pargs.length - 1);
								if (pargs) { //pargs may be undefined; evade error
									pargs = pargs.replace(rescape,"");
									args = escapeAttrs(pargs).split(",");
									arglen = args.length;
									for (ii = 0; ii < arglen; ii++) args[ii] = unescapeAttrs(args[ii]);
								}
								if (needsSecondQuery && !containsStr) { //Don't repeat queries
									if (!pargs) error(pname + " called without argument.");
									arglen = args.length;
									for (ii = 0; ii < arglen; ii++) { //Quick complex pseudos
										queried = queried.concat(mSelect(pargs,core)); //Combine arrays
									}
								}
								for (ii = 0; ii < rlength; ii++) {
									args.unshift(current = results[ii]);
									if (needsSecondQuery) {
										//:contains() can be used for text and for elements
										if (pseudos[pname].call(current,current,(containsStr ? pargs : queried),containsStr)) arr.push(current);
									} else if (needsArray.test(pname)) { //:get() requires we give it the array
										if (pname !== "last" && pname !== "first" && pname !== "only" && isNaN((pargs = parseFloat(pargs)))) error(pname + " called without argument(s).");
										if ((typeof pargs !== "undefined" ? !isNaN(pargs) : true) && pseudos[pname].call(current,current,results,pargs)) arr.push(results[ii]);
									} else if (pseudos[pname].apply(current,args)) arr.push(current);
									args.shift();
								}
								results = arr;
							} else if (match[1]) { //Attributes:
								results = rlength ? results : getAll(core);
								rlength = results.length; //Update length
								attr = match[1].replace(rescape,"");
								arr = [];
								for (ii = 0; ii < rlength; ii++) {
									if (compareAttr(attr,match[2],(match[3] ? match[3].replace(rescape,"") : ""),(current = results[ii]))) arr.push(current);
								}
								results = arr;
							} else if (match[4]) results = rlength ? useCustomFilter("tag",match[4].replace(rescape,""),results) : filter.tag(match[4].replace(rescape,""),core); //Tags
							else if (match[5]) results = rlength ? useCustomFilter("class",match[5].replace(rescape,""),results) : filter["."](match[5].replace(rescape,""),core); //Classes
							else if (match[6]) results = filter["#"](match[6].replace(rescape,""),core); //IDs
							//Remove current selector
							//For pseudos it's match[1]
							//+true === 1 and +false === 0
							sel = sel.replace(match[+isPseudo],"");
							isPseudo = false;
							++set;
						}
						if (set && old) {
							_name = sel.replace(whitespace,"").replace(spaceEscape," ").replace(plusEscape,"+").replace(gtEscape,">").replace(lineEscape,"~");
							array = [];
							olength = old.length;
							rlength = results.length;
							 if (seperator[_name]) { //Filter, since sometimes we might have something that is not a seperator
								for (ii = 0; ii < olength; ii++) {
									for (iii = 0; iii < rlength; iii++) {
										if (seperator[_name](results[iii],old[ii]) && indexOf.call(array,results[iii]) === -1) array.push(results[iii]);
									}
								}
								results = array;
							}
							//An error here will not allow selectors like: a,b > :not(c)
						}
						old = results;
					}
					//Evade errors by checking if we have looped yet
					if (set) allResults = allResults.concat(results);
				}
				return len > 1 ? allResults.sort(docOrder) : allResults;
			},
			mSelect,
			//Does browser support a native matchesSelector method
			//Which version does the browser support (prefix)
			nativeMatches = docElm.matchesSelector
				|| docElm.mozMatchesSelector
				|| docElm.msMatchesSelector
				|| docElm.oMatchesSelector
				|| docElm.webkitMatchesSelector,
			//No short way to test for :focus
			//.querySelectorAll(":enabled,:disabled") returns <input> and <button> elements only
			//We want any elements, such as <style> and <link>
			buggyQuery = [":focus",":enabled",":disabled"],
			buggyMatches = [];
		//.querySelectorAll() specific bugs
		//Use RegExp strategy by Diego Perini
		//Based on Sizzle's handling of the bugs
		(function() {
			var div = document.createElement("div");
			if (div.querySelectorAll) {
				div.innerHTML = "<select><option selected=\"\"></select>";
				if (!div.querySelectorAll("[selected]").length) buggyQuery.push("\\[(?:checked|disabled|ismap|multiple|readonly|selected|value)");
				try { //IE 8 throws error here
					//Webkit and Opera return false when :checked is used on [selected] elements
					//Should return true per CSS3 standard
					if (!div.querySelectorAll(":checked").length) buggyQuery.push(":checked");
				} catch(e) {} //No need to add to buggyQuery, because the exception will be caught by mSelect()
				div.innerHTML = "<input type=\"hidden\" a=\"\" />";
				//Firefox 3.5 doesn't handle :enabled correctly on hidden elements and returns false even if enabled
				try {
					if (!div.querySelectorAll(":enabled").length) buggyQuery.push(":disabled",":enabled");
				} catch(e) {}
				//Opera 10-12 and IE8 do not handle ^=, $=, and *= correctly
				//If no value specified, should return false
				try { //IE8 throws exception here
					if (div.querySelectorAll("[a^=\"\"]").length) buggyQuery.push("[^$*]=(?:\"\"|'')");
				} catch(e) {}
				//Opera 10 and 11 does not throw error on invalid pseudos following a comma
				try {
					div.querySelectorAll("*,:z");
					buggyQuery.push(",.*:");
				} catch(e) {}
			}
			if (nativeMatches) {
				//Disconnected matches are handled by cloning element anyway, so do not test for those
				try { //This should cause an error:
					nativeMatches.call(div,"[a!=\"\"]:z");
					buggyMatches.push("!=",pseudo);
				} catch(e) {}
			}
			buggyQuery = new RegExp(buggyQuery.join("|"));
			if (buggyMatches.length) buggyMatches = new RegExp(buggyMatches.join("|"));
			div = null;
		})();
		//Check from Sizzle:
		//Safe splice
		try {
			slice.call(docElm.childNodes,0)[0].nodeType;
		} catch(e) {
			slice = function(i) { //Node-only implementation:
				var node,
					arr = [];
				for (; (node = this[i]); i++) arr.push(node);
				return arr;
			};
		}
		/* The final version:
		 * Use querySelectorAll() if available
		 * Else, use query()
		 */
		mSelect = document.querySelectorAll && mutationObserver ? function(selector,context) { //With .querySelectorAll() support:
			context = context || document;
			var nType,_cached,result,removeID,newSelector,
				nolen = typeof context.length === "undefined";
			if (!selector || nolen ? ((nType = context.nodeType) !== 1 && nType !== 9) : false) return [];
			if (nolen) {
				if (!mSelect.cacheOn) return query(selector,context); //Speed up process for turned-off cache
				if ((_cached = getCache(context)[selector + " "])) return _cached;
				//If we have returned by now, we have cached before, so this function has been used before:
				addClearCache(context);
				//:enabled and :disabled should work on <style> and <link>, etc.
				//<option> elements in IE can't reliably use querySelectorAll()
				if (!buggyQuery.test(selector) && context.nodeName !== "OPTION") {
					if (nType === 1 && !querySelectorRoot) { //querySelectorAll() fetches wrong elements (only on elements)
						//From Sizzle
						//Thanks to Andrew Dupont
						if (!context.id) {
							context.id = expando + (new Date());
							removeID = true;
						}
						newSelector = "[id=\"" + context.id + "\"] " + selector;
					}
					//John Resig's technique:
					//http://ejohn.org/blog/thoughts-on-queryselectorall/
					try {
						result = toArray(context.querySelectorAll(newSelector || selector));
					} catch(e) {}
					if (removeID) context.removeAttribute("id");
				}
				if (!result) result = query(selector,context);
				if (!eventPseudos.test(selector)) addCache(selector,result,context); //Caching
				return result;
			}
			//From objects/arrays/functions:
			var i = 0,
				len = context.length;
			result = [];
			for (; i < len; i++) result = result.concat(mSelect(selector,context[i]));
			return mSelect.sortUnique(result); //Sort and ensure uniqueness of results
		} : function(selector,context) { //Without .querySelectorAll() support:
			//We assume there's no cache support
			context = context || document;
			var nType,
				nolen = typeof context.length === "undefined";
			if (!selector || nolen && (nType = context.nodeType) !== 1 && nType !== 9) return [];
			if (nolen) return query(selector,context);
			var i = 0,
				len = context.length,
				results = [];
			for (; i < len; i++) results = results.concat(mSelect(selector,context[i]));
			return mSelect.sortUnique(results); //Sort and ensure uniqueness for results
		};
		mSelect.pseudos = pseudos; //Pseudos
		mSelect.error = error; //Errors
		mSelect.addPseudo = function(name,callback) { //Adding pseudos
			if (!name) error("Invalid pseudo name: " + name);
			var type = typeof name,
				prop,proto;
			if (type === "object" || type === "function") {
				proto = getProtoOf(name); //Cross-browser replacement for .hasOwnProperty()
				for (prop in name) {
					if (typeof name[prop] === "function" && (!proto || name[prop] !== proto[prop])) pseudos[prop.toLowerCase()] = name[prop];
				}
			}
			if (typeof callback === "function") pseudos[name.toLowerCase()] = callback;
			return pseudos;
		};
		mSelect.renamePseudo = function(old,_new) { //For renaming already existing pseudos
			if (typeof old !== "string" || typeof _new !== "string") error("Invalid pseudo name.");
			if (!pseudos[old] && !pseudos[(old = old.toLowerCase())]) error("Unexisting pseudo: " + old);
			//Special pseudos:
			else if (secondQuery.test(old)) secondQuery = new RegExp(secondQuery.source.replace(new RegExp(old + "(?![\\w\\-])","i"),_new));
			else if (needsArray.test(old)) needsArray = new RegExp(needsArray.source.replace(new RegExp(old + "(?![\\w\\-])","i"),_new));
			pseudos[_new] = pseudos[old];
			try { //delete operator may throw exception in IE
				pseudos[old] = undefined;
				delete pseudos[old];
			} catch(e) {}
			return pseudos;
		};
		//Turning the cache on and off
		//If mutation observers aren't available,
		//Default value is false, and cache cannot
		//Be turned on at all
		mSelect.cacheOn = !!mutationObserver;
		mSelect.is = nativeMatches ? function(selector,elm) {
			//Fix disconnected nodes problems
			if (!elm.parentNode) return disconnectedElementIs(selector,elm);
			if ((!buggyMatches || !buggyMatches.test(selector)) && !buggyQuery.test(selector)) {
				try {
					return !!(elm && selector) && nativeMatches.call(elm,selector);
				} catch(e) {}
			}
			return !!(elm && selector) && indexOf.call(mSelect(selector,elm.parentNode),elm) > -1;
		} : function(selector,elm) { //Check if an element matches a selector
			//Fix disconnected nodes problems
			if (!elm.parentNode) return disconnectedElementIs(selector,elm);
			return !!(elm && selector) && indexOf.call(mSelect(selector,elm.parentNode),elm) > -1;
		};
		mSelect.not = function(selector,elm) { //Check if an element doesn't match a selector
			return !!(elm && selector) && !mSelect.is(selector,elm);
		};
		//Still being developed:
		mSelect.filter = function(selector,arr) { //Filtering an array:
			var type = typeof arr,
				array = [],
				i = 0,
				len;
			if (!arr || arr.nodeType || (type !== "object" && type !== "function")) error("Invalid object to filter."); //Throw error if invalid argument is passed
			len = arr.length;
			for (; i < len; i++) {
				if (mSelect.is(selector,arr[i])) array.push(arr[i]);
			}
			return array;
		};
		mSelect.filters = filter; //Expose filters object
		mSelect.customFilters = customFilter; //Custom filters
		mSelect.useCustomFilter = useCustomFilter; //Function that uses custom filters
		mSelect.contains = contains; //Expose contains()
		mSelect.query = query; //Expose query() for direct queries
		mSelect.sortUnique = function(arr) { //Sorting arrays based on elements' order in document(s)
			return filterUnique(arr).sort(docOrder);
		};
		mSelect.expando = expando; //Expando is exposed
		mScript.cssSelector = mSelect;
		mScript.is = mSelect.is;
		mScript.not = mSelect.not;
		mScript.contains = mSelect.contains;
	})(this || window);
	mScript.each(["is","not"],function() {
		var method = mScript[this];
		mScript.core[this] = function(selector) {
			return method(selector,this[0]);
		};
	});
	mScript.core.contains = function(elm) {
		var contains = mScript.contains,
			parent = this[0],
			i = 0,
			len = elm.length;
		elm = typeof elm === "string" ? mScript.cssSelector(elm) : [elm];
		for (; i < len; i++) {
			if (contains(parent,elm[i])) return true;
		}
		return false;
	};
	//Extra extensions for mScript object: windowLoadState
	(function() { //Change value based on the browser's progress
		//Have a variable ready to return the value of whether the window's load state
		$document.ready(function() { //When DOM is ready
			mScript.windowLoadState = 1;
		});
		var windowState = function() { //When window loads completely
			mScript.windowLoadState = 2;
		};
		//State 2:
		window.addEventListener ? window.addEventListener("load",windowState,false)
		: window.attachEvent ? window.attachEvent("onload",windowState) : false;
	})();
	//DOMReady bugs tests:
	$document.ready(function() {
		if (!window.getComputedStyle) return;
		//Does getComputedStyle return percents?
		var div = document.createElement("div"),
			margin = document.createElement("div"),
			body = document.body,
			style = div.style,
			mstyle = margin.style;
		body.insertBefore(div,body.firstChild);
		style.width = "1%";
		bugs.css.computedPercent = window.getComputedStyle && /%$/.test(window.getComputedStyle(div,null).width || "");
		mstyle.width = mstyle.marginRight = "0px";
		style.width = "1px";
		div.appendChild(margin);
		bugs.css.marginRightComputed = !!parseFloat((window.getComputedStyle(margin) || {}).marginRight);
		body.removeChild(div);
		div = null; //Release memory
	});
	/* Internet Explorer leaks
	 * Solve these problems by emptying
	 * Variables when the page is closed
	 * Note the use of attachEvent:
	 * We do not needs this to work in non-IE
	 * Use of anonymous function prevents removal
	 * $(window).on() not used, because then handler can be removed
	 */
	if (window.attachEvent) window.attachEvent("onunload",function() {
		$e = $document = null;
	});
	mScript.bugs = bugs;
	mScript.ajaxSupport = !!(detectedAJAX = mScript.detectAJAX(true)).name; //Detect whether AJAX requests can be made
	mScript.supportedAJAX = mScript.ajaxSupport ? detectedAJAX : null; //No need to call $.detectAJAX(true) repeatedly
	window.mScript = window.$ = mScript;
})(this || window);

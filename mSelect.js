/*! mSelect v.1.1
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
			return obj.__proto__ || obj.constructor.prototype;
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
		/* .getInnerText()
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
		seperatorSpace = /\s+/, //Seperator space; trim it
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
		elementSibling = function(element,type) {
			var node,
				prop = type + "Sibling";
			//If value is null and we just do if (node), we have to go through the loop
			//Prevent that with typeof node !== "undefined"
			if (typeof (node = element[type + "ElementSibling"]) !== "undefined") return node;
			while ((element = element[prop])) {
				if (element.nodeType === 1) return element;
			}
			return null;
		},
		/* createInputPseudo()
		 * Quick way to create input elements
		 * Compares attributes (optional)
		 * And matches elements against function (optional)
		 */
		createInputPseudo = function(pattern,val) {
			return function(elm) {
				var nName = elm.nodeName.toLowerCase();
				return (pattern.test ? pattern.test(nName) : pattern === nName) && (!!elm.getAttribute && elm.getAttribute("type")) === val;
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
				ainDoc = contains(adoc,a),
				binDoc = contains(bdoc,b);
			//Disconnected nodes go last
			if (!ainDoc) return binDoc ? 1 : -1;
			//We can't sort elements in different documents
			//HTML document gets precedence
			if (adoc !== bdoc) return bdoc === document ? 1 : -1;
			return a.compareDocumentPosition && a.compareDocumentPosition(b) & 4 ? -1 : 1;
		} : function(a,b) {
			var adoc = a.ownerDocument,
				bdoc = b.ownerDocument,
				ainDoc = contains(adoc,a),
				binDoc = contains(bdoc,b),
				asource,bsource;
			//Disconnected nodes go last
			if (!ainDoc) return binDoc ? 1 : -1;
			//We can't sort elements in different documents
			//HTML document gets precedence
			if (adoc !== bdoc) return bdoc === document ? 1 : -1;
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
					arr = [0],
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
				return elementSibling(elm,"previous") === sibling;
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
				var ownDoc = elm && elm.ownerDocument;
				return ownDoc && elm === ownDoc.activeElement && (!ownDoc.hasFocus || ownDoc.hasFocus()) && !!(elm.type || elm.href || ~elem.tabIndex);
			},
			active: function(elm) {
				var ownDoc = elm && elm.ownerDocument;
				return ownDoc && elm === ownDoc.activeElement;
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
			var nthmatch,pseudoMatches,currMatch,selectors,sel,all,ii,iii,nthval,len,
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
				sel = selectors[i] ? unescapeAttrs(selectors[i]) : "";
				var _split = sel.split("$split$"),
					set = 0,
					results = [],
					slen = _split.length,
					rlength,match,old,_i,current,pname,pargs;
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
							var arr = [],
								isQuoted = pargs && quotesStart.test(pargs) && quotesEnd.test(pargs),
								needsSecondQuery = secondQuery.test(pname),
								containsStr = pname === "contains" && isQuoted,
								queried = [],
								args = [],
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
							var attr = match[1].replace(rescape,""),
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
						var _name = sel.replace(whitespace,"").replace(spaceEscape," ").replace(plusEscape,"+").replace(gtEscape,">").replace(lineEscape,"~"),
							array = [],
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
			return allResults;
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
		buggyMatches = [":enabled",":disabled"];
	//.querySelectorAll() specific bugs
	//Use RegExp strategy by Diego Perini
	//Based on Sizzle's handling of the bugs
	(function() {
		var div = document.createElement("div"),
			space = whitespace.source;
		if (div.querySelectorAll) {
			div.innerHTML = "<select><option selected=\"\"></select>";
			if (!div.querySelectorAll("[selected]").length) buggyQuery.push("\\[" + space + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)");
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
				if (div.querySelectorAll("[a^=\"\"]").length) buggyQuery.push("[^$*]=" + space + "*(?:\"\"|'')");
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
		buggyMatches = new RegExp(buggyMatches.join("|"));
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
		if (!selector || nolen ? ((nType = context.nodeType) !== 1 && nType !== 9) : false) return [];
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
				if (typeof name[prop] === "function" && name[prop] !== proto[prop]) pseudos[prop.toLowerCase()] = name[prop];
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
		if (!buggyMatches.test(selector)) {
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
	window.mSelect = mSelect; //Expose
})(this || window);

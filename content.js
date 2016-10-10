// thanks to https://developer.mozilla.org/en/docs/Web/API/NodeFilter
// and http://www.thehypertexts.com/Donald%20Trump%20Nicknames.htm

var app = {
    theBestRegex: /(donald)(\s+)([j\.\s]*|john\s*)(trump)/i,
    theNicknameRegex: /(donald)(\s+)([j\.\s]*|john\s*)(".+?")(\s+)(trump)/i,
    theDonaldRegex: /(donald)([\s])*/i,
    theJRegex: /(j|john\s*)/i,
    theTrumpRegex: /^([\s])*(trump)/i,
    theUrlRegex: /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/,

    separateNodeIterator: 0,
    nodeIterator: undefined,
    nicknames: [],
    defaultNickname: "The Orange Cheeto",

    init: function() {
        var that = this;
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                that.nicknames = JSON.parse(xhr.response);
                that.trumpify();
                that.addEventListeners();
            }
        };

        xhr.open("GET", chrome.extension.getURL('/config.json'), true);
        xhr.send();
    },

    getNodeIterator: function () {
        var that = this;

        this.nodeIterator = document.createNodeIterator(
            document.body, // root
            NodeFilter.SHOW_TEXT, // filter for text nodes
            
            { // function to use for the acceptNode method of the NodeFilter
                acceptNode: function(node) {
                    if (that.separateNodeIterator || that.theDonaldRegex.test(node.data)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            }, false
        );
    },

    getNickname: function() {
        return this.nicknames[Math.floor(Math.random()*this.nicknames.length)] || this.defaultNickname;
    },

    fixFullName: function(node) {
        while (this.theBestRegex.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(this.theBestRegex, '$1$2"' + this.getNickname() + '"$2$4');
        }
    },

    fixPartialName: function(node) {
        node.nodeValue = node.nodeValue.replace(this.theTrumpRegex, '$1"' + this.getNickname() + '" $1$2');
    },

    isInvalidElement: function(node) {
        var parentTag = node.parentElement;

        return parentTag.tagName == "NOSCRIPT" 
            || parentTag.tagName == "SCRIPT"
            || this.theUrlRegex.test(parentTag.parentElement.textContent);
    },

    // todo: this could be cleaner
    checkNode: function(node) {
        // check if nickname already exists
        if (this.theNicknameRegex.test(node.data)) {
            return;
        }

        // check node is full match
        if (this.theBestRegex.test(node.data)) {
            if (!this.isInvalidElement(node)) {
                this.fixFullName(node);
            }
            this.separateNodeIterator = 0;
            return;
        }

        // recursive check for partial match
        if (this.separateNodeIterator) {
            if (this.theTrumpRegex.test(node.data)) {

                if (!this.isInvalidElement(node)) {
                    this.fixPartialName(node);
                }
        
                this.separateNodeIterator = 0;
                return;
            } else if (this.separateNodeIterator == 1 && this.theJRegex.test(node.data)) {
            } else {
                this.separateNodeIterator = 0;
                return;  
            }
        }
        
        this.separateNodeIterator++;
        this.checkNode(this.nodeIterator.nextNode());
    },

    trumpify: function() {
        var node;
        this.getNodeIterator();

        while (node = this.nodeIterator.nextNode()) {
            this.checkNode(node);
        }
    },

    addEventListeners: function() {
        var that = this;

        document.addEventListener("DOMNodeInserted", function () {
            that.trumpify();
        }, false);

        new MutationObserver(function() {
            that.trumpify();
        }).observe(document.body, {
            childList: true
        });
    }
};

app.init();

var tag_arrays = ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "picture", "portal", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"];

function printCandidateTagList(tag, target) {
    var list = getCandidateTagList(tag);
    var list_div = document.getElementById('candidate-tag-list');
    console.log(tag);
    if(tag.length == 0) {
        //list_div.style.visibility = "hidden";
    }else{
        list_div.style.visibility = "visible";
    }
    list_div.innerHTML = "추천키워드 :&nbsp;";
    list.forEach(e => {
        list_div.innerHTML += e + ",&nbsp;";
    });
}

function getCandidateTagList(tag) {
    var regExpTag = "";
    for (i = 0; i < tag.length; i++) {
        regExpTag += "[^" + tag[i] + "]*" + tag[i];
    }
    regExpTag = new RegExp(regExpTag)
    var list = new Array();
    tag_arrays.forEach(e => {
        if (e.match(regExpTag) != null)
            list.push(e);
    });
    return list;
}
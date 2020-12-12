var app = {};

app.data = {};
app.loadedPromises = [];
app.urls = {};
app.loaded = function () {
	for (var intItr in app.loadedPromises) {
		if (app.loadedPromises && app.loadedPromises[intItr])
			app.loadedPromises[intItr]();
	}
	for (var intItr in app.loadedPromises) {
		delete app.loadedPromises[intItr];
	}
};
app.getBookmark = function () {
	var objBookmark = null;
	if (app.data.bookmarks_found)
		objBookmark = app.data.bookmarks_found[0];
	if (!objBookmark)
		objBookmark = app.data;
	return objBookmark;
};
// prevent dead objects by creating them here
app.newParentArray = function () {
	var arr = new Array();
	var len = arguments.length;
	for (var intItr=0; intItr!=len; intItr++) {
		arr.push(arguments[intItr]);
	}
	return arr;
};

app.objTags={}
app.accounts =[]
app.backgroundPost = sessionPostWithRetries;
initalizeAccount();

function initalizeAccount() {
	sessionPostWithRetries({ url: "https://webcull.com/api/load", post: {}, }, 1)
		.then(function (arrData) {
			if (arrData.no_user)
				return;
			app.data = arrData;
			processURLs();
			// Task CHX-009
			// Load accounts on load
			sessionPostWithRetries({ url: "https://webcull.com/api/accounts", post: {}, }, 1)
			.then((response)=>{
				app.accounts = response.users
			})
			.catch((error)=>{
				console.log(error)
			})
		})
		.catch(error => {
			console.log(error)
		})
}

app.processURLs = processURLs;
function processURLs() {
	app.objTags = {};
	for (var intParent in app.data.stacks) {
		var intLen = app.data.stacks[intParent].length;
		for (var intItr = 0; intItr < intLen; ++intItr) {
			var objStack = app.data.stacks[intParent][intItr];
			if (objStack.is_url == 1) {
				app.urls[objStack.value] = 1;
			}
			if (objStack.tags && objStack.tags.length){
				var arrTags = String(objStack.tags).split(/[ ,]+/g);
				arrTags.forEach((tag)=>{
					if (tag in app.objTags){
						app.objTags[tag]+=1
					}
					app.objTags[tag] = 1
				})
			}
		}
	}
}

app.alterIcon = alterIcon;
function alterIcon(strUrl) {
	var boolExists = strUrl != "" && app.urls[strUrl];
	if (boolExists) {
		chrome.browserAction.setIcon({
			path: {
				"16": "images/webcull-16x.png",
				"32": "images/webcull-32x.png",
				"48": "images/webcull-48x.png",
				"128": "images/webcull-128x.png"
			}
		});
	} else {
		chrome.browserAction.setIcon({
			path: {
				"128": "images/logo-gray-128.png"
			}
		});
	}

}
app.modifyBookmark=modifyBookmark;
function modifyBookmark(strName, strVal) {
	var objBookmark = app.getBookmark(),
	arrModify = {
		proc: 'modify',
		stack_id: objBookmark.stack_id,
		name: strName,
		value: dblEncode(strVal)
	};
	app.backgroundPost({ url: "https://webcull.com/api/modify", post: arrModify })
		.then(response => {})
		.catch(error => console.log(error))
}

// make sure it saves on disconnect
chrome.runtime.onConnect.addListener(function (externalPort) {
	externalPort.onDisconnect.addListener(function () {
		app.saveCrumbs();
	});
});

// for general navigation
chrome.webNavigation.onBeforeNavigate.addListener(function (tab) {
	if (tab.frameId == 0) {
		chrome.tabs.getSelected(null, function (selectedTab) {
			if (selectedTab.id == tab.tabId) {
				alterIcon(tab.url);
			}
		});
	}
});

// for tracking forwarding
chrome.webRequest.onBeforeRequest.addListener(function (details) {
	if (details.type == "main_frame") {
		chrome.tabs.getSelected(null, function (selectedTab) {
			if (selectedTab.id == details.tabId) {
				alterIcon(details.url);
			}
		});
	}
}, { urls: ["<all_urls>"] });

// for when the tab is switched
chrome.tabs.onActivated.addListener(function (info) {
	chrome.tabs.get(info.tabId, function (tab) {
		//if (tab.url != "")
		alterIcon(tab.url);
	});
});

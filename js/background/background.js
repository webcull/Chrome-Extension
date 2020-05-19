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
// prevent connections like saves
app.backgroundPost = function (arrParams) {
	sessionPost(arrParams);
};

initalizeAccount();

function initalizeAccount() {
	sessionPost({
		url : "https://webcull.com/api/load",
		post : {
			
		},
		success : function (arrData) {
			if (arrData.no_user)
				return;
			app.data = arrData;
			processURLs();
		}
	});
}

app.processURLs = processURLs;
function processURLs() {
	for (var intParent in app.data.stacks) {
		var intLen = app.data.stacks[intParent].length;
		for (var intItr=0; intItr<intLen; ++intItr) {
			var objStack = app.data.stacks[intParent][intItr];
			if (objStack.is_url == 1) {
				app.urls[objStack.value] = 1;
			}
		}
	}
}


app.alterIcon = alterIcon;
function alterIcon(strUrl) {
	console.log(strUrl);
	var boolExists = strUrl != "" && app.urls[strUrl];
	if (boolExists) {
		chrome.browserAction.setIcon({
			path : {
				"16": "images/webcull-16x.png",
				"32": "images/webcull-32x.png",
				"48": "images/webcull-48x.png",
				"128": "images/webcull-128x.png"
			}
		});
	} else {
		console.log("Doesn't exists");
		chrome.browserAction.setIcon({
			path : {
				"128": "images/logo-gray-128.png"
			}
		});
	}

}

// make sure it saves on disconnect
chrome.runtime.onConnect.addListener(function (externalPort) {
	externalPort.onDisconnect.addListener(function () {
  		app.saveCrumbs();
	});
});

// for general navigation
chrome.webNavigation.onBeforeNavigate.addListener(function(tab) {
	if (tab.frameId == 0) {
		chrome.tabs.getSelected(null, function(selectedTab) {
			if (selectedTab.id == tab.tabId) {
				alterIcon(tab.url);
			}
		});
	}
});

// for tracking forwarding
chrome.webRequest.onBeforeRequest.addListener(function (details) {
	if (details.type == "main_frame") {
		chrome.tabs.getSelected(null, function(selectedTab) {
			if (selectedTab.id == details.tabId) {
				alterIcon(details.url);
			}
		});
	}
},{urls: ["<all_urls>"]});

// for when the tab is switched
chrome.tabs.onActivated.addListener(function(info) {
    chrome.tabs.get(info.tabId, function (tab) {
    	//if (tab.url != "")
    	alterIcon(tab.url);
    });
});

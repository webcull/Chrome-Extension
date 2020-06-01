class WebCullError extends Error {
	constructor(message, cause) {
		super(message);
		this.cause = cause;
		this.code = cause
		this.name = 'WebCullError';
	}
}
var arrDefaultParams = {},
	ERRORS = {
		'NO_COOKIE': {
			code: 'NO_COOKIE',
			msg: 'No cookie was found'
		},
		'GET_TAB_FAILED': {
			code: 'GET_TAB_FAILED',
			msg: 'Failed to get tab'
		}
	};

async function getCookies(domain, name) {
	return new Promise(function (resolve, reject) {
		chrome.cookies.get({ "url": domain, "name": name }, function (cookie) {
			if (cookie) {
				resolve(cookie.value);
			}
			reject(new WebCullError(ERRORS.NO_COOKIE.msg, ERRORS.NO_COOKIE.code))

		});
	})
}
async function sessionPost(arrParams) {
	return new Promise(function (resolve, reject) {
		getCookies("https://webcull.com", "__DbSessionNamespaces").then(function (session_hash) {
			if (arrDefaultParams) $.extend(arrParams.post, arrDefaultParams);
			$.extend(arrParams.post, { __DbSessionNamespaces: session_hash });
			fetch(arrParams.url, {
				method: 'post',
				headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
				body: $.queryString(arrParams.post)
			})
				.then(function (response) {
					return response.text()
				})
				.then(function (response) {
					var mixedData = JSON.parse(response);
					resolve(mixedData)
				})
				.catch(function (erorr) {
					reject(erorr)
				})
		}).catch(function (error) {
			reject(error)
		})
	})

}
async function getTab() {
	return new Promise(function (resolve, reject) {
		chrome.tabs.getSelected(null, function (tab) {
			if (tab) resolve(tab);
			reject(new WebCullError(ERRORS.GET_TAB_FAILED.code, ERRORS.GET_TAB_FAILED.msg))
		});
	})
}
async function sessionPostWithRetries(arrParams, retries = 0, delayMs = 15) {
	var promise = sessionPost(arrParams);
	for (var i = 0; i < retries; i++) {
		promise = promise.catch(function (err) {
			return new Promise((resolve, reject) => {
				setTimeout(reject.bind(null, err), delayMs);
			});
		}).catch(function (err) {
			return sessionPost(arrParams);
		});
	}
	return promise;

}
function dblEncode(val) {
	return encodeURIComponent(encodeURIComponent(val));
}
function backlog(strVal) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.executeScript(
			tabs[0].id,
			{ code: 'console.log(unescape("' + escape(strVal) + '"));' }
		);
	});
}
function isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
}

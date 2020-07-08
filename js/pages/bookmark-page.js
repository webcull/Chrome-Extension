chrome.runtime.connect();

var background = chrome.extension.getBackgroundPage(),
	app = background.app,
	switchAccounts = function (event) {
		event.preventDefault()
		var email = event.target.dataset["email"]
		if (!email) return false
		app.backgroundPost({ url: "https://webcull.com/api/switch", post: { "email": email } }, 1)
			.then(function (response) {
				paging('bookmark-page');
			})
			.catch(function (error) {
				console.log(error)
			})
	},
	loadAccounts = function () {
		var $userAccountList = $("#accountsList"),
			markUp = `<a class="userRow captureFocus" href="#">
					<div class="userIcon" style="background-image: url(../images/account.png);"></div>
					<div class="userText">
						<div class="userName">@chris<div class="userLoading hidden">
								<div class="radial-loader"></div>
							</div>
						</div>
					</div>
				</a>`;
		arrUserAccounts = app.accounts.length ? Array.from(app.accounts) : [];
		$userAccountList.html('')
		if (!arrUserAccounts.length) return
		for (let index = 0; index < arrUserAccounts.length; index++) {
			if (app.data.user && (app.data.user.name === arrUserAccounts[index].name)) continue;
			var user = arrUserAccounts[index], $user = $(markUp), username = user.name, icon = user.icon, email = user.email;
			if (icon) $user.find('.userIcon').css({ 'background-image': 'url("https://webcull.com/repository/images/users/avatar/' + icon + '")' });
			$user.find('.userIcon').attr('data-email', email)
			$user.find('.userName').html(username).attr('data-email', email)
			$user.attr('data-email', email)
			$user.attr('id', email)
			$user.appendTo($userAccountList)
		}
		$userAccountList.find('.userRow').each(function () {
			$(this).click(switchAccounts, false)
		})
	}
/* init process */
pages['bookmark-page'] = function ($self) {
	getTab()
		.then(function (tab) {
			var strURL = tab.url.replace(/ /, '+');
			if (0 == 1 && !strURL.match(/http(s)?:\/\//i)) {
				paging("loading-page");
				// not http or https so just take user to webcull
				chrome.tabs.update({
					url: "https://webcull.com"
				});
			} else {
				$("html,body").removeClass('is-init');
				/* Try to save the current URL as a bookmark */
				// Get the current URL
				$("body").removeClass('is-loaded');
				var $progressBar = $("#progress-bar");
				$.delay(1, function () {
					$progressBar.addClass('loading-started');
				});
				app.urls[strURL] = 1;
				app.alterIcon(strURL);
				var post = {
					url: "https://webcull.com/api/autosavelink",
					post: {
						url: strURL
					}
				}
				app.backgroundPost(post, 1)
					.then(function (arrData) {
						if (arrData.no_user) {
							// FIX CHX-004 show accounts sign in 
							// if not logged in
							$progressBar.addClass('response-recieved').addClass('assets-loaded').addClass('complete');
							// fire loaded event 
							app.loaded()
							return paging("accounts-page")
						}
						app.data = arrData;
						app.processURLs();
						$progressBar.addClass('response-recieved');
						$progressBar.addClass('assets-loaded');
						$("#account-user").html(arrData.user.name);
						if (arrData.user.icon) {
							var css = {
								'background-image': "url('https://webcull.com" + arrData.user.icon + "')"
							};
							if (arrData.user.icon == "/static/images/icons/general/temp5.png") {
								css.filter = 'brightness(1000%)';
							}
							$("#account-icon").addClass('custom').css(css);
						}
						var $bookmarkStatus = $("#bookmark-status"),
							objBookmark = app.getBookmark();
						if (objBookmark.user) {
							$bookmarkStatus.html("Bookmark saved <a href='#' class='bookmark-status-link red' id='removeBookmark'>Undo</a>");
						} else {
							var intBookmarksFound = arrData.bookmarks_found.length;
							$bookmarkStatus.html("Already saved in " + intBookmarksFound + " location" + (intBookmarksFound == 1 ? '' : 's') + " <a href='#' class='bookmark-status-link red' id='removeBookmark'>Remove</a>");
						}
						$bookmarkStatus.find("#removeBookmark").click(function () {
							delete app.urls[strURL];
							app.alterIcon(strURL);
							app.backgroundPost({ url: "https://webcull.com/api/remove", post: { stack_id: objBookmark.stack_id } }, 1)
								.then(function () {
									// Fix CHX-005
									$bookmarkStatus.html("Bookmark removed <a href='#' class='bookmark-status-link red' id='addBookmark'>Re-add</a>");
									$("#bookmark-title-input").attr('disabled', true)
									$("#bookmark-url-input").attr('disabled', true)
									$("#bookmark-keywords-input").attr('disabled', true)
									$("#bookmark-notes-input").attr('disabled', true)
									$("#save-location-input").attr('disabled', true)
									$bookmarkStatus.find("#addBookmark").click(function () {
										$("#bookmark-title-input").removeAttr('disabled')
										$("#bookmark-url-input").removeAttr('disabled')
										$("#bookmark-keywords-input").removeAttr('disabled')
										$("#bookmark-notes-input").removeAttr('disabled')
										$("#save-location-input").removeAttr('disabled')
										$progressBar.removeClass('loading-started').removeClass('response-recieved').removeClass('assets-loaded').removeClass('complete')
										paging('bookmark-page');
									})
								})
								.catch(function (error) {
									/* Fetch error */
									console.log(error)
								})
						});
						if (objBookmark.nickname)
							$("#bookmark-title-input").val(objBookmark.nickname).trigger('update');
						if (objBookmark.value)
							$("#bookmark-url-input").val(objBookmark.value).trigger('update');
						if (objBookmark.tags)
							//bookmarkTags.val=objBookmark.tags.split(',');
							$("#bookmark-tags-input").val(String(objBookmark.tags).replace(/\s+/g, ',')).trigger('update');
						if (objBookmark.notes)
							$("#bookmark-notes-input").val(objBookmark.notes).trigger('update');
						if (objBookmark.icon)
							$("#bookmark-icon").css({
								'background-image': 'url("https://webcull.com/repository/images/websites/icons/' + objBookmark.icon + '")'
							});
						$("body").addClass('is-loaded');
						$progressBar.addClass('complete');
						app.loaded();
						if (!objBookmark.parse_date || objBookmark.parse_date == "") {
							$("#bookmark-icon").addClass("loading");
							app.backgroundPost({ url: "https://webcull.com/api/process", post: { web_data_id: objBookmark.web_data_id } }, 1)
								.then(function (objResponse) {
									$("#bookmark-icon").removeClass("loading");
									if (objResponse.icon)
										$("#bookmark-icon").css({
											'background-image': 'url("https://webcull.com/repository/images/websites/icons/' + objResponse.icon + '")'
										});
									if (objResponse.nickname)
										$("#bookmark-title-input").val(objResponse.nickname).trigger('update');
								})
								.catch(err => { console.log(err) })
						}
						$progressBar.removeClass('complete')
							.removeClass('assets-loaded')
							.removeClass('response-recieved')
							.removeClass('loading-started')
						$.delay(50, function () {
							sessionPostWithRetries({ url: "https://webcull.com/api/accounts", post: {}, }, 1)
								.then((response) => {
									app.accounts = response.users
								})
							loadAccounts();
						})
					}).catch(function (error) {
						/* Fetch error */
						// Task: CHX-007
						// show retry page
						$progressBar.removeClass('complete')
							.removeClass('assets-loaded')
							.removeClass('response-recieved')
							.removeClass('loading-started')
						// fire loaded event 
						app.loaded()
						if (error.constructor.name === 'WebCullError') {
							if (error.code === 'NO_COOKIE') return paging("accounts-page")
						}
						else {
							var context = {
								callback: function () {
									paging('bookmark-page')
								},
								title: 'Request Error',
								msg: 'An Error ocurred while saving bookmark. Ensure you have an Active Internet connection',
								action: 'Try Again'

							}
							console.log(error)
							return paging('network-page', context)
						}
					})
			}
		})
		.catch(function (error) {
			/* Failed t get tab */
			console.log(error)
		})
}

/* modules and binders */
$(function () {
	var $locationInput = $("#save-location-input"),
		$tagsInput = $("#bookmark-tags-input"),
		arrCrumbs = [0],
		arrCrumbsValues = [""],
		arrLastCrumbs,
		arrLastCrumbsValues,
		intSelectedCrumb = 0,
		intOpenMenuIndex = 0,
		arrTempStacks = {};
	$locationInput.trigger('update')
	app.loadedPromises.push(function () {
		// work backwards to build the bread crumbs
		var arrCrumbsFound = [],
			objBookmark = app.getBookmark(),
			objStackIdLookup = {};
		if (objBookmark) {
			// for speed create an index of all stack ids so that we can look up parent id
			for (var intParent in app.data.stacks) {
				for (var intItr in app.data.stacks[intParent]) {
					objStackIdLookup[app.data.stacks[intParent][intItr].stack_id] = app.data.stacks[intParent][intItr];
				}
			}
			// reconstruct crumbs from data
			// check if bookmark is in root if not do nothing
			var intParent = objBookmark.parent_id;
			if (intParent != 0) {
				// if not then reconstruct the crumbs from parent and stack id
				arrCrumbs = [null];
				while (1) {
					var objStack = objStackIdLookup[intParent];
					if (!objStack)
						break;
					intParent = objStack.parent_id * 1;
					arrCrumbs.unshift(objStack.stack_id * 1);
					arrCrumbsValues.unshift(objStack.nickname);
				};
				arrCrumbs.unshift(0);
				arrCrumbsValues.unshift("");
				$("#save-location-input").val(arrCrumbsValues.join("/")).trigger('update');
			}
		}
		arrLastCrumbs = arrCrumbs.slice(0);
		arrLastCrumbsValues = arrCrumbsValues.slice(0);
	});
	$locationInput.on('input change update', processLocationText)
	$locationInput.on('blur', saveChanges)
	var hideTimeout 
	$locationInput.on('change', function () {
		var intStackId = processLocationText(), me = this, hide = () => setTimeout(() => me.inputAutocomplete.hide(), 500);
		if (intStackId) {
			var arrStacks = loadStacks(intStackId)
			if (arrStacks.length) {
				if(hideTimeout)clearTimeout(hideTimeout);
				setTimeout(() => me.inputAutocomplete.display(arrStacks), 100)
				return true;
			} else {
				hideTimeout=hide()
				return true
			}
		} else {
			hideTimeout=hide()
			return true
		};
	})
	var tags = new InputAutocomplete({
		selector: '#tags',
		minCharactersForSuggestion: 1,
		suggestionCallback: function (input) {
			var arrTags = String(input).replace(/\s+/g, ',').split(',').filter(tag => tag.length > 0),
				input,
				arrTagObjects = [];
			if (!arrTags.length) return arrTagObjects;
			input = arrTags[arrTags.length - 1];
			arrTagObjects = Object.entries(app.objTags)
				.filter(arrKeyValue => arrTags.indexOf(arrKeyValue[0]) === -1)
				.filter(arrKeyValue => input.localeCompare(arrKeyValue[0].slice(0, input.length), undefined, { sensitivity: 'base' }) === 0)
				.map((arrKeyValue) => {
					return {
						value: arrKeyValue[0],
						text: arrKeyValue[0],
						description: `Used in ${arrKeyValue[1]} locations`
					}
				})
			return arrTagObjects
		},
		onSelect: function (selected) {
			var arrTags = String($tagsInput.val())
				.replace(/\s+/g, ',')
				.split(',')
				.filter(tag => tag.length > 0)
			arrTags.pop()
			arrTags.push(selected.text)
			$tagsInput.val(arrTags.join(",")).trigger('update');
		}
	});
	var locations = new InputAutocomplete({
		selector: '#locations',
		minCharactersForSuggestion: 2,
		suggestionCallback: function (input) {
			c = processLocationText()
			if (isNaN(c)) {
				this.options.noMatchesText = displayNoStacks();
				return
			}
			var arrStacks = loadStacks(c)
			if (arrStacks.length) {
				return arrStacks
			} else {
				this.options.noMatchesText = displayNoStacks();
			}
		},
		onSelect: function (selected) {
			var strVal = $locationInput.val(),
				arrVal = strVal.split(/\//);
			arrCrumbs[intOpenMenuIndex + 1] = selected.value * 1;
			arrCrumbsValues[intOpenMenuIndex + 1] = selected.text;
			arrVal[intOpenMenuIndex + 1] = selected.text;
			if (intOpenMenuIndex != arrCrumbs.length - 2) {
				arrVal.length = intOpenMenuIndex + 2;
				arrCrumbs.length = intOpenMenuIndex + 2;
				arrCrumbsValues.length = intOpenMenuIndex + 2;
			}
			arrVal.push("");
			$locationInput.val(arrVal.join("/")).trigger('change');
		}
	})
	function processLocationText() {
		var strVal = $locationInput.val(),
			arrVal = strVal.split(/\//),
			intVal = arrVal.length,
			intCaretPos = $locationInput[0].selectionStart,
			intCaretItem,
			intMenuItem,
			intValCharPast = 0;

		if (arrVal.length < 2 || arrVal[0] != "") {
			$locationInput.val("/" + strVal);
			return processLocationText();
		}
		if (strVal.match(/\/\//)) {
			$locationInput.val(strVal.replace(/\/\//, '/'));
			return processLocationText();
		}
		for (var intItr = 1; intItr != intVal; intItr++) {
			var strTextCrumb = arrVal[intItr],
				intCrumb = arrCrumbs[intItr],
				intParentCrumb = arrCrumbs[intItr - 1];
			if (intParentCrumb === null && arrCrumbs.length > 2) {
				arrCrumbs[intItr] = null;
				arrCrumbsValues[intItr] = strTextCrumb;
			} else {
				if (strTextCrumb == "") {
					arrCrumbs[intItr] = null;
					arrCrumbsValues[intItr] = "";
					continue;
				}
				var arrStacks = app.data.stacks[intParentCrumb],
					arrBuffer = [];
				if (!arrStacks) {
					arrCrumbs[intItr] = null;
					arrCrumbsValues[intItr] = strTextCrumb;
					continue;
				}
				for (var intStack in arrStacks) {
					var objStack = arrStacks[intStack];
					if (objStack.is_url == 0)
						arrBuffer.push(objStack);
				}
				arrBuffer.sort(function (a, b) {
					return a.order_id - b.order_id;
				});
				var boolTextSearch = false;
				textSearch: while (1) {
					boolTextSearch = false;
					for (var intBuffer in arrBuffer) {
						var objStack = arrBuffer[intBuffer];
						if (intCrumb != null) {
							if (objStack.stack_id == intCrumb) {
								if (objStack.nickname != strTextCrumb) {
									intCrumb = null;
									continue textSearch;
								} else {
									boolTextSearch = true;
									break;
								}
							}
						} else {
							if (strTextCrumb == objStack.nickname) {
								boolTextSearch = true;
								arrCrumbs[intItr] = objStack.stack_id * 1;
								arrCrumbsValues[intItr] = strTextCrumb;
								break;
							}
						}
					}
					break;
				}
				if (!boolTextSearch) {
					arrCrumbs[intItr] = null; // set as new folder
					arrCrumbsValues[intItr] = strTextCrumb;
				}
			}
		}
		arrCrumbs.length = intItr;
		arrCrumbsValues.length = intItr;

		for (var intItr = 0; intItr != intVal; intItr++) {
			var strCurrentVal = arrVal[intItr],
				intCurrentVal = strCurrentVal.length;
			if (
				intCaretPos >= intValCharPast
				&& intCaretPos <= intValCharPast + intCurrentVal
			) {
				intCaretItem = intItr;
				break;
			}
			intValCharPast += intCurrentVal + 1;
		}
		if (!intCaretItem) intCaretItem++;
		intCaretItem--;
		intSelectedCrumb = arrCrumbs[intCaretItem + 1];
		intOpenMenuIndex = intCaretItem;
		var boolLastCrumb = intCaretItem == intVal - 2;
		var intCrumb = !intCaretItem ? 0 : arrCrumbs[intCaretItem];
		if (intMenuItem != intCrumb || (intSelectedCrumb == null && !boolLastCrumb)) {
			//drawMenu(intCrumb);
			return intCrumb
		}
	}
	function displayNoStacks() {
		var arrMissingNicknames = [],
			intCrumbs = arrCrumbs.length;
		for (var intItr = 0; intItr != intCrumbs; ++intItr) {
			var intCrumb = arrCrumbs[intItr];
			if (intCrumb === null) {
				var strCrumbValue = arrCrumbsValues[intItr];
				if (strCrumbValue.length)
					arrMissingNicknames.push(strCrumbValue);
			}
		}
		if (arrMissingNicknames.length) {
			return `Create stack:<b>${arrMissingNicknames.join("/")}</b>`
		} else {
			return '<b>Empty</b>'
		}
	}
	function loadStacks(intParent) {
		var arrStacks = app.data.stacks[intParent]
		if (arrStacks) {
			var arrBuffer = arrStacks.filter(stack => stack.is_url == '0')
				.sort((a, b) => { return a.order_id - b.order_id })
				.map((objStack) => {
					return { value: objStack.stack_id, text: objStack.nickname.trim(), description: '' }
				})
			return arrBuffer
		} else {
			return []
		}
	}
	function cleanUpTempStacks() {
		var intCrumbs = arrCrumbs.length,
			arrDeleteItems = [];
		for (var intStack in arrTempStacks) {
			var boolFound = false;
			for (var intItr = 0; intItr != intCrumbs; ++intItr) {
				var intCrumb = arrCrumbs[intItr];
				if (intStack == intCrumb) {
					boolFound = true;
					break;
				}
			}
			if (!boolFound) {
				var intParent = arrTempStacks[intStack];
				if (!app.data.stacks[intParent])
					continue;
				arrDeleteItems.push(intStack);
				var intCurrent = app.data.stacks[intParent].length;
				if (intCurrent == 1) {
					delete app.data.stacks[intParent];
				} else {
					for (var intItr = 0; intItr != intCurrent; ++intItr) {
						var objStack = app.data.stacks[intParent][intItr];
						if (!objStack)
							continue;
						if (objStack.stack_id == intStack)
							delete app.data.stacks[intParent][intItr];
					}
				}
				delete arrTempStacks[intStack];
			}
		}
		if (arrDeleteItems.length)
			app.backgroundPost({
				url: "https://webcull.com/api/remove",
				post: {
					stack_id: arrDeleteItems
				}
			}, 1)
				.then(function (response) { })
				.catch(error => { console.log(error) })
	}
	function didCrumbsChange() {
		var strCrumbsString = arrCrumbsValues.join("\t").replace(/\t+$/, ''),
			strLastCrumbsString = arrLastCrumbsValues.join("\t").replace(/\t+$/, '');
		if (strCrumbsString != strLastCrumbsString)
			return true;
		strCrumbsString = arrCrumbs.join("\t").replace(/\t+$/, '');
		strLastCrumbsString = arrLastCrumbs.join("\t").replace(/\t+$/, '');
		if (strCrumbsString != strLastCrumbsString)
			return true;
	}
	app.saveCrumbs = saveChanges;
	function saveChanges() {
		if (!didCrumbsChange()) {
			return;
		}
		var objBookmark = app.getBookmark();
		app.backgroundPost({
			url: "https://webcull.com/api/savelocation",
			post: {
				arrCrumbs: arrCrumbs,
				arrCrumbsValues: arrCrumbsValues,
				stack_id: objBookmark.stack_id
			}
		}, 1)
			.then(function (data) {
				var intNewStacks = data.new_stack_ids.length;
				if (intNewStacks) {
					for (var intItr = 0; intItr != intNewStacks; ++intItr) {
						arrCrumbs.pop(); // take the nulls off the end
					}
					var
						intCrumbs = arrCrumbs.length,
						intParent = arrCrumbs[intCrumbs - 1] * 1;
					for (var intItr = 0; intItr != intNewStacks; ++intItr) {
						var intStack = data.new_stack_ids[intItr] * 1;
						arrCrumbs.push(intStack);
						if (!app.data.stacks[intParent])
							app.data.stacks[intParent] = [];
						var objNewStack = {
							stack_id: intStack,
							parent_id: intParent,
							is_url: 0,
							nickname: arrCrumbsValues[intItr + intCrumbs],
							value: "",
							order_id: app.data.stacks[intParent].length + 1
						};
						arrTempStacks[intStack] = intParent;
						app.data.stacks[intParent].push(objNewStack);
						intParent = intStack;
					}
					arrLastCrumbs = arrCrumbs.slice(0);
					arrLastCrumbsValues = arrCrumbsValues.slice(0);
				}
				cleanUpTempStacks();
			})
			.catch(function (error) {

			})
		arrLastCrumbs = arrCrumbs.slice(0);
		arrLastCrumbsValues = arrCrumbsValues.slice(0);
	}
	$("#webcull-action").click(function () {
		chrome.tabs.update({
			url: "https://webcull.com/bookmarks/"
		});
		window.close();
	})
	// logout handler
	$("#bookmark-logout").click(function () {
		chrome.tabs.update({
			url: "https://webcull.com/logout/index/acc/" + app.data.user.hash + "/"
		});
		window.close();
	});

	/* auto update text-box binder */
	$(".initStackUpdate").each(function () {
		$(this).stackUpdate();
	});
	/*  Account switching */
	(function () {
		var $account_switcher = $("#account-switcher"),
			$bookmarkMainView = $("#bookmark-main-view"),
			$switchBtn = $("#bookmark-switch-user"),
			$switchBackBtn = $("#bookmark-switch-back");
		function showAccountSwitcher(e) {
			$bookmarkMainView.addClass('animate-opacity').addClass("hidden")
			$account_switcher.removeClass('hidden').addClass("animate-left")
			$switchBtn.removeClass("show").addClass("hidden")
			$switchBackBtn.removeClass("hidden").addClass("show")
		}
		function hideAccountSwitcher(e) {
			$account_switcher.addClass("animate-left").addClass("hidden")
			$bookmarkMainView.removeClass('hidden').addClass("animate-right")
			$switchBtn.removeClass("hidden").addClass("show")
			$switchBackBtn.removeClass("show").addClass("hidden")

		}
		$("#bookmark-switch-user").click(function (e) {
			showAccountSwitcher(e)
		});
		$("#bookmark-switch-back").click(function (e) {
			hideAccountSwitcher(e)
		});
	})();
});

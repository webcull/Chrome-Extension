chrome.runtime.connect();

var background = chrome.extension.getBackgroundPage(),
	app = background.app,
	switchAccounts = function (event) {
		event.preventDefault();
		window.hideAccountSwitcher(event);
		var email = event.target.dataset["email"]
		if (!email) return false;
		is_loading();
		app.backgroundPost({ url: "https://api.webcull.com/api/switch", post: { "email": email } }, 1)
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
		if (!arrUserAccounts.length) return;
		var boolAdded = false;
		for (let index = 0; index < arrUserAccounts.length; index++) {
			if (app.data.user && (app.data.user.name === arrUserAccounts[index].name)) 
				continue;
			var 
			user = arrUserAccounts[index], 
			$user = $(markUp), 
			username = user.name, 
			icon = user.icon, 
			email = user.email;
			if (icon) $user.find('.userIcon').css({ 'background-image': 'url("https://content.webcull.com/images/users/avatar/' + icon + '")' });
			$user.find('.userIcon').attr('data-email', email)
			$user.find('.userName').html(username).attr('data-email', email)
			$user.attr('data-email', email)
			$user.attr('id', email)
			$user.appendTo($userAccountList)
			boolAdded = true;
		}
		$userAccountList.find('.userRow').each(function () {
			$(this).click(switchAccounts, false)
		})
		if (!boolAdded) {
			$userAccountList.html('<div class="no-account">No other accounts</div>');
		}
	}
/* init process */
pages['bookmark-page'] = function ($self) {
	getTab()
	.then(function (tab) {
		var strURL = tab.url;
		if (0 == 1 && !strURL.match(/http(s)?:\/\//i)) {
			paging("loading-page");
			// not http or https so just take user to webcull
			chrome.tabs.update({
				url: "https://webcull.com/"
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
				url: "https://api.webcull.com/api/autosavelink",
				post: {
					url: encodeURIComponent(encodeURIComponent(strURL))
				}
			}
			is_loading();
			app.backgroundPost(post, 1)
			.then(function (arrData) {
				$("#bookmark-title-input").removeAttr('disabled')
				$("#bookmark-url-input").removeAttr('disabled')
				$("#bookmark-keywords-input").removeAttr('disabled')
				$("#bookmark-notes-input").removeAttr('disabled')
				$("#save-location-input").removeAttr('disabled')
				is_loaded();
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
				app.initCrumbs();
				$progressBar.addClass('response-recieved');
				$progressBar.addClass('assets-loaded');
				$("#account-user").html(arrData.user.name);
				if (arrData.user.icon) {
					var css = {
						'background-image': "url('https://content.webcull.com" + arrData.user.icon + "')"
					};
					if (arrData.user.icon == "/static/images/icons/general/temp5.png") {
						css.filter = 'brightness(1000%)';
					} else {
						css.filter = '';
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
					app.backgroundPost({ url: "https://api.webcull.com/api/remove", post: { stack_id: objBookmark.stack_id } }, 1)
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
					$("#bookmark-tags-input").val(objBookmark.tags).trigger('update');
				if (objBookmark.notes)
					$("#bookmark-notes-input").val(objBookmark.notes).trigger('update');
				if (objBookmark.icon)
					$("#bookmark-icon").css({
						'background-image': 'url("https://content.webcull.com/images/websites/icons/' + objBookmark.icon + '")'
					});
				$("body").addClass('is-loaded');
				$progressBar.addClass('complete');
				app.loaded();
				if (!objBookmark.parse_date || objBookmark.parse_date == "") {
					$("#bookmark-icon").addClass("loading");
					app.backgroundPost({ url: "https://api.webcull.com/api/process", post: { web_data_id: objBookmark.web_data_id } }, 1)
						.then(function (objResponse) {
							$("#bookmark-icon").removeClass("loading");
							if (objResponse.icon)
								$("#bookmark-icon").css({
									'background-image': 'url("https://content.webcull.com/images/websites/icons/' + objResponse.icon + '")'
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
					sessionPostWithRetries({ url: "https://api.webcull.com/api/accounts", post: {}, }, 1)
						.then((response) => {
							app.accounts = response.users
						})
					loadAccounts();
				})
			}).catch(function (error) {
				is_loaded();
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
var refDeactivationTimeout;
/* modules and binders */
$(function () {
	$("input,textarea").focus(function () {
		console.log('de1');
		if ($(this).attr('id') != "save-location-input") {
			console.log('de2');
			app.deactivateLoaf();
		}
	});
	$("#webcull-action").click(function () {
		chrome.tabs.create({
			url: "https://api.webcull.com/bookmarks/index/acc/" + app.data.user.hash + "/"
		});
		window.close();
	})
	// logout handler
	$("#bookmark-logout").click(function () {
		chrome.tabs.create({
			url: "https://webcull.com/logout/index/acc/" + app.data.user.hash + "/"
		});
		window.close();
	});
	/* auto update text-box binder */
	$(".initStackUpdate").each(function () {
		$(this).stackUpdate();
	});
	/* bookmark location breadcrumbs binder */
	(function () {
		// init breadcrumbs
		var $input = $("#save-location-input"),
		boolMenuDropped = false,
		intOpenMunuIndex = 0,
		$saveLocationDrop = $("<div id='save-location-drop'></div>"),
		intMenuItem = 0,
		intSelectedCrumb = 0,
		$empty = null,
		// a list of ids that have been created
		// stacks should be removed if they were created here but are no longer part of the list
		arrTempStacks = {};
		$input.trigger('update');
		app.initCrumbs = initCrumbs;
		app.loadedPromises.push(app.initCrumbs);
		function initCrumbs() {
			app.arrCrumbs = app.newParentArray(0);
			app.arrCrumbsValues = app.newParentArray("");
			app.arrLastCrumbs = app.arrCrumbs;
			app.arrLastCrumbsValues = app.arrCrumbsValues;
		
			// work backwords to build the bread crumbs
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
					app.arrCrumbs = [null];
					while (1) {
						var objStack = objStackIdLookup[intParent];
						if (!objStack)
							break;
						intParent = objStack.parent_id * 1;
						app.arrCrumbs.unshift(objStack.stack_id * 1);
						app.arrCrumbsValues.unshift(objStack.nickname);
					}
					app.arrCrumbs.unshift(0);
					app.arrCrumbsValues.unshift("");
					$("#save-location-input").val(app.arrCrumbsValues.join("/"));
				} else {
					$("#save-location-input").val('/');
				}
			}
			app.arrLastCrumbs = app.arrCrumbs.slice(0);
			app.arrLastCrumbsValues = app.arrCrumbsValues.slice(0);
		}
		// loop through crumbs to see if temp crumbs are no longer in use
		// if they are, initialize a the deletion of them
		function cleanUpTempStacks() {
			var intCrumbs = app.arrCrumbs.length,
				arrDeleteItems = [];
			for (var intStack in arrTempStacks) {
				var boolFound = false;
				for (var intItr = 0; intItr != intCrumbs; ++intItr) {
					var intCrumb = app.arrCrumbs[intItr];
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
					url: "https://api.webcull.com/api/remove",
					post: {
						stack_id: arrDeleteItems
					}
				}, 1)
					.then(function (response) { })
					.catch(error => { console.log(error) })
		}
		function didCrumbsChange() {
			if (!app.arrLastCrumbsValues)
				return false;
			var strCrumbsString = app.arrCrumbsValues.join("\t").replace(/\t+$/, ''),
				strLastCrumbsString = app.arrLastCrumbsValues.join("\t").replace(/\t+$/, '');
			if (strCrumbsString != strLastCrumbsString)
				return true;
			strCrumbsString = app.arrCrumbs.join("\t").replace(/\t+$/, '');
			strLastCrumbsString = app.arrLastCrumbs.join("\t").replace(/\t+$/, '');
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
				url: "https://api.webcull.com/api/savelocation",
				post: {
					arrCrumbs: app.arrCrumbs,
					arrCrumbsValues: app.arrCrumbsValues,
					stack_id: objBookmark.stack_id
				}
			}, 1)
				.then(function (data) {
					var intNewStacks = data.new_stack_ids.length;
					if (intNewStacks) {
						for (var intItr = 0; intItr != intNewStacks; ++intItr) {
							app.arrCrumbs.pop(); // take the nulls off the end
						}
						var
							intCrumbs = app.arrCrumbs.length,
							intParent = app.arrCrumbs[intCrumbs - 1] * 1;
						for (var intItr = 0; intItr != intNewStacks; ++intItr) {
							var intStack = data.new_stack_ids[intItr] * 1;
							app.arrCrumbs.push(intStack);
							if (!app.data.stacks[intParent])
								app.data.stacks[intParent] = [];
							var objNewStack = {
								stack_id: intStack,
								parent_id: intParent,
								is_url: 0,
								nickname: app.arrCrumbsValues[intItr + intCrumbs],
								value: "",
								order_id: app.data.stacks[intParent].length + 1
							};
							arrTempStacks[intStack] = intParent;
							app.data.stacks[intParent].push(objNewStack);
							intParent = intStack;
						}
						app.arrLastCrumbs = app.arrCrumbs.slice(0);
						app.arrLastCrumbsValues = app.arrCrumbsValues.slice(0);
					}
					cleanUpTempStacks();
				})
				.catch(function (error) {

				})
			app.arrLastCrumbs = app.arrCrumbs.slice(0);
			app.arrLastCrumbsValues = app.arrCrumbsValues.slice(0);
		}
		function displayNoStacks() {
			var intMenuItems = $(".save-location-drop-item:not(.hidden)").length,
				// find new stacks
				arrMissingNicknames = [];
			var intCrumbs = app.arrCrumbs.length;
			for (var intItr = 0; intItr != intCrumbs; ++intItr) {
				var intCrumb = app.arrCrumbs[intItr];
				if (intCrumb === null) {
					var strCrumbValue = app.arrCrumbsValues[intItr];
					if (strCrumbValue.length)
						arrMissingNicknames.push(strCrumbValue);
				}
			}
			if (intMenuItems == 0) {
				if (!$saveLocationDrop.find(".save-location-drop-message").length)
					$empty = $("<div class='save-location-drop-message'>Empty</div>").appendTo($saveLocationDrop);
				if (arrMissingNicknames.length) {
					$empty.html("Create stack: <b>" + arrMissingNicknames.join("/") + "</b>");
				} else {
					$empty.html("Empty");
				}
			} else {
				if ($empty) {
					$empty.remove();
				}
			}
		}
		// draw menu
		function drawMenu(intParent) {
			$saveLocationDrop[0].scrollTop = 0;
			intMenuItem = intParent;
			$saveLocationDrop.html('');
			var
				arrStacks = app.data.stacks[intParent],
				arrBuffer = [];
			if (arrStacks) {
				for (var intStack in arrStacks) {
					var objStack = arrStacks[intStack];
					if (objStack.is_url == 0)
						arrBuffer.push(objStack);
				}
				arrBuffer.sort(function (a, b) {
					return a.order_id - b.order_id;
				});
				var intItr2 = 0;
				for (var intItr in arrBuffer) {
					var objStack = arrBuffer[intItr];
					if (objStack.is_url == 1) {
						continue;
					}
					var $item = $("<div class='save-location-drop-item' id='save-location-drop-" + objStack.stack_id + "'>")
					.bind('click', (function (objStack) {
						return function () {
							$.clear(refDeactivationTimeout);
							$("#save-location-input").focus();
							var strVal = $input.val(),
								arrVals = strVal.split(/\//);
							app.arrCrumbs[intOpenMunuIndex + 1] = objStack.stack_id * 1;
							app.arrCrumbsValues[intOpenMunuIndex + 1] = objStack.nickname;
							arrVals[intOpenMunuIndex + 1] = objStack.nickname;
							if (intOpenMunuIndex != app.arrCrumbs.length - 2) {
								arrVals.length = intOpenMunuIndex + 2;
								app.arrCrumbs.length = intOpenMunuIndex + 2;
								app.arrCrumbsValues.length = intOpenMunuIndex + 2;
							}
							arrVals.push("");
							$input.val(arrVals.join("/"));
							processLocationText();

						};
					})(objStack))
					.text(objStack.nickname)
					.appendTo($saveLocationDrop)
					.if(intItr2++ == 0)
					.addClass('selected');
				}
				highlightSelected(intSelectedCrumb);
			}
		}
		// look for any changes in the text and caret location
		function processLocationText() {
			// take the input val, split it
			var
			strVal = $input.val(),
			arrVals = strVal.split(/\//),
			intVals = arrVals.length,
			strLastVal = arrVals[intVals - 1],
			intCaretPos = $input[0].selectionStart,
			intCaretItem,
			intValCharPast = 0,
			strNewKeyword = null;

			if (
				arrVals.length < 2
				|| arrVals[0] != ""
			) {
				$input.val("/" + strVal);
				return processLocationText();
			}
			if (strVal.match(/\/\//)) {
				$input.val(strVal.replace(/\/\//, '/'));
				return processLocationText();
			}
			// keep the crumb buffer in sync with whats in the text
			// whats in the buffer is always the top priority unless it's undefined and theres a match
			// text matching must be done through id when possible because duplicate names is a thing
			for (var intItr = 1; intItr != intVals; intItr++) {
				var
				strTextCrumb = arrVals[intItr], // from text
				intCrumb = app.arrCrumbs[intItr], // from mem
				intParentCrumb = app.arrCrumbs[intItr - 1],
				strCrumb = app.arrCrumbsValues[intItr]; // from mem
				// if the parent doesnt exist theres nothing to search which means its always new
				if (intParentCrumb === null && app.arrCrumbs.length > 2) { // no parent
					app.arrCrumbs[intItr] = null; // set as new folder
					app.arrCrumbsValues[intItr] = strTextCrumb;
					// if theres not crumb id do a text
				} else {//} else if (strTextCrumb != strCrumb) { 
					// optimize process when nothings there
					if (strTextCrumb == "") {
						app.arrCrumbs[intItr] = null;
						app.arrCrumbsValues[intItr] = "";
						continue;
					}
					// didnt match. modify whats in the buffer if it differs from what in the text
					// text that doesnt match must be considered a change of folder or new folder if it doesnt exist
					// load the child folders to see if there's something else that does match
					var
						arrStacks = app.data.stacks[intParentCrumb],
						arrBuffer = [];
					if (!arrStacks) {
						app.arrCrumbs[intItr] = null;
						app.arrCrumbsValues[intItr] = strTextCrumb;
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
					// search for an id or text mismatch
					var boolTextSearch = false;
					textSearch: while (1) {
						boolTextSearch = false;
						for (var intBuffer in arrBuffer) {
							var objStack = arrBuffer[intBuffer];
							if (intCrumb != null) { // we have id. always prioritize id over a text search
								if (objStack.stack_id == intCrumb) {
									// verify if the text matches the stack
									if (objStack.nickname != strTextCrumb) {
										// it doesn't anymore. which means the text was changed
										// kill the association and resart the search
										intCrumb = null;
										continue textSearch;
									} else {
										boolTextSearch = true;
										break;
									}
								}
							} else { // we don't have an id
								// when theres no id in the buffer a text can be matched using a text search
								if (strTextCrumb == objStack.nickname) { // text matches
									boolTextSearch = true;
									app.arrCrumbs[intItr] = objStack.stack_id * 1; // set as new folder	
									app.arrCrumbsValues[intItr] = strTextCrumb;
									break;
								}
							}
						}
						break;
					}
					// add blanks at end
					if (!boolTextSearch) {
						app.arrCrumbs[intItr] = null; // set as new folder
						app.arrCrumbsValues[intItr] = strTextCrumb;
						//displayNoStacks();
					}
				}
			}
			// remove an items from the end that are no longer in the text
			app.arrCrumbs.length = intItr;
			app.arrCrumbsValues.length = intItr;

			// find the item the caret is on an item
			for (var intItr = 0; intItr != intVals; intItr++) {
				var strCurrentVal = arrVals[intItr],
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
			if (!intCaretItem)
				intCaretItem++;
			intCaretItem--;
			intSelectedCrumb = app.arrCrumbs[intCaretItem + 1];
			intOpenMunuIndex = intCaretItem;
			var boolLastCrumb = intCaretItem == intVals - 2;
			var intCrumb = !intCaretItem ? 0 : app.arrCrumbs[intCaretItem];
			if (intMenuItem != intCrumb || (intSelectedCrumb == null && !boolLastCrumb)) {
				drawMenu(intCrumb);
			}
			if (
				intMenuItem == null
				|| boolLastCrumb
				|| (
					intSelectedCrumb == null
				)
			) {
				narrowMenuList(app.arrCrumbsValues[intCaretItem + 1]);
			}
			displayNoStacks();
		}
		function highlightSelected(intCrumb) {
			$saveLocationDrop.find('.save-location-drop-item').removeClass('selected');
			$("#save-location-drop-" + intCrumb).addClass('selected');
			keepSelectionInView();
		}
		function narrowMenuList(strSearch) {
			var intSearch = !strSearch ? 0 : strSearch.length,
				boolMenuChanged = false;
			$saveLocationDrop.find(".save-location-drop-item").each(function () {
				var $this = $(this),
					strVal = $this.html(),
					strSubVal = strVal.substr(0, intSearch);
				if ((!intSearch || strSubVal.toLowerCase() === strSearch.toLowerCase())) {
					if ($this.hasClass('hidden')) {
						$this.removeClass('hidden');
						boolMenuChanged = true;
					}
				} else if (intSearch) {
					if (!$this.hasClass('hidden')) {
						$this.addClass('hidden');
						boolMenuChanged = true;
					}
				}
			});
			if (boolMenuChanged) {
				$saveLocationDrop.find('.selected').removeClass('selected');
				var $nonHiddenItems = $saveLocationDrop.find(".save-location-drop-item:not(.hidden)");
				if ($nonHiddenItems.length) {
					if ($empty) {
						$empty.remove();
						$empty = null;
					}
					$nonHiddenItems.become(0).addClass('selected');
				} else {
					displayNoStacks();
				}
			}
		}
		function bindKeyboard() {
			$input.bind('keydown', function (e) {
				var
					boolNavigateUp = e.key == 'ArrowUp',
					boolNavigateDown = e.key == 'ArrowDown';
				if (boolNavigateUp || boolNavigateDown) {
					e.preventDefault();
				}
				if (boolNavigateUp) {
					var
						$selected = $saveLocationDrop.find(".selected:not(.hidden)");
					if (!$selected.length) {
						$selected = $saveLocationDrop.find(".save-location-drop-item:not(.hidden)").become(-1).addClass('selected');
					} else {
						var
							$next = $selected.prev('.save-location-drop-item:not(.hidden)');
						$selected.removeClass('selected');
						if ($next.length) {
							$next.addClass('selected');
						} else {
							$selected.removeClass("selected");
						}
					}
					keepSelectionInView();
				} else if (boolNavigateDown) {
					var
						$selected = $saveLocationDrop.find(".selected:not(.hidden)");
					if (!$selected.length) {
						$selected = $saveLocationDrop.find(".save-location-drop-item:not(.hidden)").become(0).addClass('selected');
					} else {
						var
							$next = $selected.next('.save-location-drop-item:not(.hidden)');
						$selected.removeClass('selected');
						if ($next.length) {
							$next.addClass('selected');
						} else {
							$selected.removeClass("selected");
							$saveLocationDrop[0].scrollTop = 0;
						}
					}
					keepSelectionInView();
				} else if (e.key == "Enter") {
					$saveLocationDrop.find(".save-location-drop-item.selected").trigger('click');
				} else {
					processLocationText();
				}
			});
		}
		function keepSelectionInView() {
			var
				$selected = $saveLocationDrop.find('.selected');
			if ($selected.length) {
				intSelectedHeight = $selected.height(),
					intDropTop = $saveLocationDrop[0].scrollTop,
					intDropHeight = $saveLocationDrop.height(),
					intDropBottom = intDropHeight + intDropTop,
					intSelectedOffset = $selected.offset().top,
					intSelectedTop = intSelectedOffset + intDropTop,
					intSelectedBottom = intSelectedTop + intSelectedHeight;
				if (intSelectedBottom > intDropBottom) {
					// too low
					$saveLocationDrop[0].scrollTop = intSelectedTop;
				} else if (intSelectedOffset < 0) {
					// too low
					$saveLocationDrop[0].scrollTop = Math.max(0, intSelectedTop - intDropHeight + intSelectedHeight);
				}
			}
		}
		function dropMenu() {
			$("#save-location .placeholder").append($saveLocationDrop);
			boolMenuDropped = true;
		}
		function activateLoaf() {
			if (!boolMenuDropped) {
				var
					intCrumbs = app.arrCrumbs.length,
					intParent = !app.arrCrumbs.length ? 0 : app.arrCrumbs[intCrumbs - 1];
				dropMenu();
				intOpenMunuIndex = 0;
				drawMenu(intParent);
			}
			processLocationText();
		}
		app.deactivateLoaf = deactivateLoaf;
		function deactivateLoaf() {
			if (!boolMenuDropped)
				return;
			boolMenuDropped = false;
			$saveLocationDrop.remove();
			saveChanges();
		}
		
		bindKeyboard();
		$("#save-location-input").on("focus keyup keydown keypress click change", function () {
			$.clear(refDeactivationTimeout);
			activateLoaf();
		});
		$("#save-location-input").on("blur", function () {
			refDeactivationTimeout = $.delay(500, function () {
				if (!$("#save-location-input:focus").length) {
					deactivateLoaf();
				}
			});
		});
	})();
	// Tags suggestion input
	(function () {
		var $tagsInput = $("#bookmark-tags-input"), tagsHideTimeout;
		$tagsInput.on("focus keyup keydown keypress click change", function () {
			if (tagsHideTimeout) $.clear(tagsHideTimeout);
			return true
		});
		$tagsInput.on("blur", function () {
			tagsHideTimeout = $.delay(200, function () {
				$tagsInput[0].inputAutocomplete && $tagsInput[0].inputAutocomplete.hide();
				return true
			});
		});

		var tags = new InputAutocomplete({
			selector: '#tags',
			minCharactersForSuggestion: 1,
			suggestionCallback: function (input) {
				var arrTags = String(input).replace(/\s+/g, ',').split(/[, ]+/g).filter(tag => tag.length > 0),
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
					.split(/[, ]+/g)
					.filter(tag => tag.length > 0)
				arrTags.pop()
				arrTags.push(selected.text)
				$tagsInput.val(arrTags.join(", ")).trigger('update');
			}
		});

	})();
	/*  Account switching */
	(function () {
		var $account_switcher = $("#account-switcher"),
			$bookmarkMainView = $("#bookmark-main-view"),
			$switchBtn = $("#bookmark-switch-user"),
			$switchBackBtn = $("#bookmark-switch-back");
		function showAccountSwitcher(e) {
			//$bookmarkMainView.addClass('animate-opacity')
			$account_switcher.addClass("animate-in")
			$bookmarkMainView.addClass("animate-out")
			$switchBtn.removeClass("show").addClass("hidden")
			$switchBackBtn.removeClass("hidden").addClass("show")
		}
		window.showAccountSwitcher = showAccountSwitcher;
		function hideAccountSwitcher(e) {
			$account_switcher.removeClass("animate-in")
			$bookmarkMainView.removeClass("animate-out")
			$switchBtn.removeClass("hidden").addClass("show")
			$switchBackBtn.removeClass("show").addClass("hidden")

		}
		window.hideAccountSwitcher = hideAccountSwitcher;
		$("#bookmark-switch-user").click(function (e) {
			showAccountSwitcher(e)
		});
		$("#bookmark-switch-back").click(function (e) {
			hideAccountSwitcher(e)
		});
	})();
});
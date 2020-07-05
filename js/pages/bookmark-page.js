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
							$("#bookmark-tags-input").val(objBookmark.tags).trigger('update');
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
	// Tags input
	let Tags = new InputAutocomplete({
		selector: '#tags',
		minCharactersForSuggestion: 1,
		suggestionCallback: function (input) {
			input = input.split(',')[input.split(",").length - 1].trim()
			var arrTagObjects = Object.entries(app.objTags)
				.map((arrKeyValue) => {
					return { value: arrKeyValue[0], text: arrKeyValue[0], description: `Used in ${arrKeyValue[1]} locations` }
				})
				.filter(value => input.localeCompare(value.text.slice(0, input.length), undefined, { sensitivity: 'base' }) === 0)
			return arrTagObjects
		},
		onSelect: function (selected) {
			console.log(selected)
		}
	})
	window.Tags = Tags

	// Location input
	var $input = $("#save-location-input"),
		arrCrumbs = [0],
		arrCrumbsValues = [""],
		arrLastCrumbs,
		arrLastCrumbsValues,
		boolMenuDropped = false,
		intOpenMunuIndex = 0,
		$saveLocationDrop = $("<div id='save-location-drop'></div>"),
		intMenuItem = 0,
		intSelectedCrumb = 0,
		$empty = null,
		arrTempStacks = {};
	$input.trigger('update')
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
				$("#save-location-input").val(arrCrumbsValues.join("/"));
				console.log(arrCrumbs)
			}
		}
		arrLastCrumbs = arrCrumbs.slice(0);
		arrLastCrumbsValues = arrCrumbsValues.slice(0);
	});
	let Locations = new InputAutocomplete({
		selector: '#locations',
		minCharactersForSuggestion: 1,
		suggestionCallback: function (input) {
			console.log(input)
			var intCrumbs = arrCrumbs.length,
				intParent = !arrCrumbs.length ? 0 : arrCrumbs[intCrumbs - 1],
				arrStacks = app.data.stacks[intParent];
			console.log(arrCrumbs, arrStacks)
			if (arrStacks) {
				var arrBuffer = arrStacks.filter(stack => stack.is_url)
					.sort((a, b) => { return a.order_id - b.order_id })
				console.log(arrBuffer)
				return []
			} else {
				return []
			}
		},
		onSelect: function (selected) {
			console.log(selected)
		}
	})
	window.Locations = Locations

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
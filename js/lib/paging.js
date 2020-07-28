var pages = {};
function paging(strPageName, objPageContext = null) {
	$(".page").removeClass('active');
	var $page = $("#" + strPageName);
	$page.addClass('active');
	$('html').attr('id', "html-" + strPageName);
	if (pages[strPageName])
		pages[strPageName]($page, objPageContext);
	$.delay(1, function () {
		$page.addClass('active-on');
	});
}
function is_loading() {
	$('body').addClass('is-loading-override');
}
function is_loaded() {
	$('body').removeClass('is-loading-override');
}
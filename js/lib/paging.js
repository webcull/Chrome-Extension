var pages = {};
function paging(strPageName) {
	$(".page").removeClass('active');
	var $page = $("#" + strPageName);
	$page.addClass('active');
	$('html').attr('id', "html-" + strPageName);
	if (pages[strPageName])
		pages[strPageName]($page);
	$.delay(1, function () {
		$page.addClass('active-on');
	});
}
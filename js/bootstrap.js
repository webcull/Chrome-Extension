$(function () {
	if (navigator.onLine) {
		paging('bookmark-page');
	} else {
		paging('network-page')
	}

});
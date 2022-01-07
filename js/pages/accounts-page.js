pages['accounts-page'] = function ($self) { }
$(function () {

    $("#sign-in").click(function () {
        chrome.tabs.create({
            url: "https://app.webcull.com/accounts"
        });
        window.close();
    });
    $("#addAccount").click(function () {
    	chrome.tabs.create({
            url: "https://app.webcull.com/accounts"
        });
        window.close();
    });
})
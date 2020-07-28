var NETWORK_DEFAULTS = {
    msg: "Can't connect to the cloud...",
    title: 'Network Error',
    callback: function () {
        paging('bookmark-page')
    },
    action: 'RETRY'
};
pages['network-page'] = function ($self, context) {
    var text = context && context.action ? context.action : NETWORK_DEFAULTS.action,
        callback = context && context.callback ? isFunction(context.callback) ? context.callback : NETWORK_DEFAULTS.callback : NETWORK_DEFAULTS.callback,
        msg = context && context.msg ? context.msg : NETWORK_DEFAULTS.msg,
        title = context && context.title ? context.title : NETWORK_DEFAULTS.title,
        $action = $self.find("#action"),
        $error_type = $self.find('#error-type'),
        $error_msg = $self.find('#error-msg');

    $action.html(text)
    $action.unbind('click').click(callback)
    $error_msg.html(msg)
    $error_type.html(title)
}
$(function () { })
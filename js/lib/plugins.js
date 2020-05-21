$(function () {
	$(".placeholder").click(function (e) {
		if (!$(e.target).hasClass('placeholder-input'))
			$(this).find('.placeholder-input').focus();

	});
	$(".placeholder .placeholder-input")
	.on('click.placeholderInput focus.placeholderInput', function () {
		$(this)
		.closest('.placeholder')
		.addClass('placeholder-focus')
		.trigger('placeholder-focus')
		.trigger('change');
	})
	.on('blur.placeholderInput', function () {
		$(this)
		.closest('.placeholder')
		.removeClass('placeholder-focus')
		.trigger('placeholder-blur')
		.trigger('change');
	});
	$(".placeholder")
	.on('change.placeholderInput', function () {
		if ($(this).find('.placeholder-input').val() != "") {
			$(this).addClass('has-data');
		} else {
			$(this).removeClass('has-data');
		}
	})
	.on('update.placeholderInput', function () {
		var $this = $(this);
		$.delay(1, function () {
			$this.find(".placeholder-input").trigger('click blur change');
			$this.trigger('change');
		});
	});
	$.plugin('stackUpdate', function () {
		var 
		$this = this,
		strEvents = 'keyup.stackUpdate click.stackUpdate blur.stackUpdate change.stackUpdate',
		refUpdateDelay,
		strCurrentValue = $this.val();
		if ($this.hasClass('stackUpdate'))
			return $this;
		$this
		.addClass('stackUpdate')
		.bind(strEvents, function () {
			var strName = $this.attr('name'),
			strVal = $this.val();
			if (strName == 'value' && !strVal.match(/^https?:\/\//i)) {
				// validate url
				$this.addClass('error');
				return;
			} else if (strVal == '') {
				$this.addClass('error');
				return;
			} else {
				$this.removeClass('error');
			}
			window.clearTimeout(refUpdateDelay);
			refUpdateDelay = $.delay(1000, (function (that) {
				return function () {
					updateCall(that);
				};
			})($this[0]));
		});
		function updateCall(that) {
			var $this = $(that);
			if ($this.hasClass('error'))
				return;
			var strVal = $this.val();
			if (strVal == strCurrentValue)
				return;
			// make sure it still exists
			strCurrentValue = strVal;
			var
			strName = $this.attr('name');
			if (!strName || !strName.length) {
				return alert('Error missing name parameter for update call');
			}
			var objBookmark = app.data.bookmarks_found[0];
			var arrModify = {
				proc : 'modify',
				stack_id : objBookmark.stack_id,
				name : strName,
				value : dblEncode(strVal)
			};
			console.log(arrModify);
			app.backgroundPost({
				url : "https://webcull.com/api/modify",
				post : arrModify,
				success : function () {
					
				}
			});
		}
		return $this;
	});
})
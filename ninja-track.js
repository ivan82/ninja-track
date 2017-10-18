var NinjaTrack = function(target, trackWindowResize, trackMouseMove, mouseMoveThreshold, mouseMoveElapsedMsThreshold, onUserLeaving){
	this.tracking = true;
	this.target = target || document;
	this.timeStamp = 0;
	this.timeStampStart = 0;
	this.events = [];
	this.trackWindowResize = trackWindowResize || true;
	this.trackMouseMove = trackMouseMove || true;
	this.mouseX = 0;
	this.mouseY = 0;
	this.mouseFlag = 0;
	this.mouseMoveThreshold = mouseMoveThreshold || 100;
	this.mouseMoveElapsedMsThreshold = mouseMoveElapsedMsThreshold || 1000;
	this.eventTypes = ['mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'cut', 'paste', 'change', 'submit', 'reset', 'scroll', 'orientationchange', 'gestureend'];
	this.windowDimension = undefined;
	this.onUserLeaving = onUserLeaving;
};

NinjaTrack.prototype = {
	init: function(){
		this.bindEventListeners();
		this.startTracking();
	},

	bindEventListeners: function(removeListeners){
		var method = removeListeners ? 'removeEventListener' : 'addEventListener';
		for(var i = 0, len = this.eventTypes.length; i < len; i++){
			this.bindEventListenerMethod(this.target, this.eventTypes[i], method);
		}

		if(this.trackMouseMove){ this.bindEventListenerMethod(this.target, 'mousemove', method); }
		if(this.trackWindowResize){ this.bindEventListenerMethod(window, 'resize', method); }

		//bind user leaving events
		window.onbeforeunload = this.onUserLeaving;
	},

	bindEventListenerMethod: function(target, type, listenerMethod){
		var ref = this;
		listenerMethod = listenerMethod || 'addEventListener';
		target[listenerMethod](type, function(event){ ref.eventListener(event); });
	},

	triggerUserLeaving: function(){
		if(!this.onUserLeaving){ return; }
		this.onUserLeaving(this.events);
	},

	eventListener: function(event){
		if(!this.tracking){ return; }
		var value, mouseDragging = false;
		var scrollX = document.body.scrollLeft;
		var scrollY = document.body.scrollTop;
		var x = event.clientX + scrollX;
		var y = event.clientY + scrollY;
		var type = event.type;
		var target = event.target;
		var currentTimeStamp = new Date().getTime();
		var elapsedMs = currentTimeStamp - this.timeStamp;


		//checking if mouse is dragging, trackMouseMove must be enabled
		if(type === 'mousedown'){
			this.mouseFlag = 0;
		}else if(type === 'mousemove'){
			this.mouseFlag = 1;
		}else if(type === 'mouseup'){
			mouseDragging = this.mouseFlag === 1;
		}

		//checking if user is leaving
		//F5 - refresh button pressed
		if(type === 'keydown' && event.keyCode == 116){
			this.triggerUserLeaving();
		}else if(type === 'mousedown' && target.nodeName === 'A'){
			if(!target.target || target.target === '_self'){
				this.triggerUserLeaving();
			}
		}else if(type === 'submit'){
			this.triggerUserLeaving();
		}


		if(this.trackMouseMove && type === 'mousemove'){
			if(elapsedMs < this.mouseMoveElapsedMsThreshold){ return; }

			var xDiff = this.valueDiff(this.mouseX, x) > this.mouseMoveThreshold;
			var yDiff = this.valueDiff(this.mouseY, y) > this.mouseMoveThreshold;
			if(xDiff || yDiff){
				this.mouseX = x;
				this.mouseY = y;
				this.recordEvent(type, {x: x, y: y}, target, elapsedMs);
			}
		}else{
			if(/mousedown|mouseup|click|dblclick/.test(type)){
				var which = event.which;
				var button = event.button;
				var left = false, right = false, middle = false;
				if((which && which === 3) || button === 2){ right = true; }
				else if((which && which === 2) || button === 4){ middle = true; }
				else{left = true; }

				value = {x: x, y: y, dragging: mouseDragging, left: left, middle: middle, right: right, type: which || button};
			}else if(/keydown|keypress|keyup/.test(type)){
				value = {keyCode: event.keyCode, which: event.which, key: event.key, value: target.value};
			}else if(/copy|cut|paste/.test(type)){
				value = event.clipboardData;
			}else if(type === 'change'){
				var isInput = target.nodeName === 'INPUT';
				var isSelect = target.nodeName === 'SELECT';
				var isCheckbox = false;
				var isRadio = false;
				var isChecked;
				var isTextbox = false;
				var tmpValue;
				if(isInput){
					isCheckbox = target.type === 'checkbox';
					isRadio = target.type === 'radio';

					if(isCheckbox || isRadio){
						isChecked = target.checked;
					}else{
						isTextbox = true;
					}
				}
				value = {isInput: isInput, isCheckbox: isCheckbox, isRadio: isRadio, isTextbox: isTextbox, value: target.value};

				if(isSelect){
					value.selectedIndex = target.selectedIndex;
				}

			}else if(type === 'scroll'){
				value = {x: window.pageXOffset, y: window.pageYOffset};
			}else if(type === 'resize'){
				value = {width: window.innerWidth, height: window.innerHeight};
				target = document.body;
			}else if(type === 'orientationchange'){
				value = screen.orientation.angle;
				target = screen;
			}else if(type === 'gestureend'){
				var scale = event.scale;
				var pinch = false, zoom = false;
				if(scale < 1.0) {
					pinch = true;
				}else if(scale > 1.0) {
					zoom = true;
				}
				value = {scale: scale, pinch: pinch, zoom: zoom};
			}
			this.recordEvent(type, value, target, elapsedMs);
		}
		this.timeStamp = currentTimeStamp;
	},

	recordEvent: function(type, value, target, elapsedMs){
		this.events.push({type: type, value: value, target: target, elapsedMs: elapsedMs});
	},

	valueDiff: function(a, b){
		return Math.abs(a - b);
	},

	stopTracking: function(){
		this.tracking = false;
	},

	startTracking: function(){
		this.tracking = true;
		this.timeStamp = new Date().getTime();
		this.timeStampStart = this.timeStamp;
		this.windowDimension = {width: window.innerWidth, height: window.innerHeight};
	}
};


var NinjaTrackPlayer = function(){
	this.speed = 1;
	this.currentIndex = 0;
	this.events = undefined;
	this.timeoutId = undefined;
	this.target = undefined;
	this.elements = [];
	this.clickSequence = 0;
};

NinjaTrackPlayer.prototype = {
	init: function(events, target, windowDimension){
		target = target || document;
		if(target === document){ target = document.body; }
		if(windowDimension){
			this.setElementDimension(target, windowDimension.width+'px', windowDimension.height+'px');
		}

		var pointer = this.createPointerIcon();
		target.appendChild(pointer);

		this.target = target;
		this.pointer = pointer;
		this.events = events;
	},

	createPointerIcon: function(){
		var pointer = document.createElement('i');
		pointer.className = 'fa fa-mouse-pointer mouse-pointer';
		return pointer;
	},

	createClickIcon: function(){
		var click = document.createElement('i');
		click.className = 'fa fa-circle mouse-event';
		return click;
	},

	play: function(index, speed){
		window.clearTimeout(this.timeoutId);
		if(!this.events || this.events.length === 0 || index >= this.events.length){ return; }

		var ref = this;
		var even = this.events[index];
		this.currentIndex = index;
		this.speed = speed;
		this.execute(even);

		this.timeoutId = window.setTimeout(function(){
			ref.play(++index);
		}, even.elapsedMs * this.speed);
	},


	execute: function(event){
		if(!event){ return; }
		var type = event.type;
		var target = event.target;
		if(/mousemove|mousedown|mouseup|click|dblclick/.test(type)){
			var x = event.value.x;
			var y = event.value.y;

			this.setElementPosition(this.pointer, x+'px', y+'px');
			var clickIcon = this.createClickIcon();
			clickIcon.className += ' ' + type;
			if(type === 'click'){ clickIcon.innerHTML = ++this.clickSequence; }
			this.target.appendChild(clickIcon);
			this.setElementPosition(clickIcon, x+'px', y+'px');
		}else if(/keydown|keypress|keyup/.test(type)){
			if(target.type === 'password'){
				target.type = 'text';
				target.typeChangedFrom = 'password';
			}
			target.value = event.value.value;
		}else if(type === 'change'){
			target.selectedIndex = event.value.selectedIndex;
		}else if(type === 'scroll'){
			target.scrollTo(event.value.x, event.value.y);
		}else if(type === 'resize'){
			this.setElementDimension(target, event.value.width+'px', event.value.height+'px');
		}
	},

	setElementPosition: function(element, x, y){
		element.style.top = y;
		element.style.left = x;
	},

	setElementDimension: function(element, width, height){
		element.style.width = width;
		element.style.height = height;
	}
};

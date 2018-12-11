enyo.kind({
	name: "g.sample.HelloWorldSample",
	// handler for drag finish which calls 'eventHandler' function when drag finished.
	handlers: {
		ondragfinish: "eventHandler"
	},
	classes: "enyo-unselectable garnet g-layout-text-center main-view",
	components: [
		{kind: "g.Title", content: "Hello World"},
		{content: "Drag right to close app", classes:"g-sample-hello"}
	],
	// recognize drag right to close app
	eventHandler: function(inSender, inEvent) {
		if (inEvent.xDirection === 1) {
			window.close();
		}
	}
});

// After Enyo framework loaded, a callback function specified by enyo.ready() is called.
// This sample app does not require any device API, sample app is launched when Enyo loaded.
enyo.ready(function () {
    new g.sample.HelloWorldSample().renderInto(document.body);
});

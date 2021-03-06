/**
 * @file js/pages/catalog/MonographHandler.js
 *
 * Copyright (c) 2000-2012 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class MonographHandler
 * @ingroup js_pages_catalog
 *
 * @brief Handler for a monograph entry.
 *
 */
(function($) {


	/**
	 * @constructor
	 *
	 * @extends $.pkp.classes.Handler
	 *
	 * @param {jQuery} $monographsContainer The HTML element encapsulating
	 *  the monograph list div.
	 * @param {Object} options Handler options.
	 */
	$.pkp.pages.manageCatalog.MonographHandler =
			function($monographsContainer, options) {

		// Initialize and save parameters.
		this.parent($monographsContainer, options);
		this.monographId_ = options.monographId;
		this.seq_ = options.seq;
		this.setFeaturedUrlTemplate_ = options.setFeaturedUrlTemplate;
		this.isFeatured_ = options.isFeatured;
		this.datePublished_ = options.datePublished;
		this.workflowUrl_ = options.workflowUrl;
		this.catalogUrl_ = options.catalogUrl;

		// Attach the view type handlers, if links exist.
		$monographsContainer.find('.star, .star_highlighted').click(
				this.callbackWrapper(this.featureButtonHandler_));

		$monographsContainer.find('a[id^="catalogEntry"]').click(
				this.callbackWrapper(this.activateAction));

		$monographsContainer.find('a[id^="workflow"]').click(
				this.callbackWrapper(this.workflowButtonHandler_));

		$monographsContainer.find('a[id^="publicCatalog"]').click(
				this.callbackWrapper(this.publicCatalogButtonHandler_));

		// Expose list events to the container
		this.publishEvent('monographListChanged');
		this.publishEvent('monographSequencesChanged');

		// Bind for enter/exit of Organize mode
		this.bind('changeDragMode', this.changeDragModeHandler_);

		// Bind for setting a new sequence
		this.bind('setSequence', this.setSequenceHandler_);
	};
	$.pkp.classes.Helper.inherits(
			$.pkp.pages.manageCatalog.MonographHandler,
			$.pkp.controllers.linkAction.LinkActionHandler);


	//
	// Private Properties
	//
	/**
	 * The sequence (sort order) of this monograph entry.
	 * @private
	 * @type {int?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.seq_ = null;


	/**
	 * The publication date of this monograph entry.
	 * @private
	 * @type {date?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.datePublished_ = null;


	/**
	 * The ID of this monograph entry.
	 * @private
	 * @type {int?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.monographId_ = null;


	/**
	 * The current state of the featured flag.
	 * @private
	 * @type {boolean?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.isFeatured_ = null;


	/**
	 * The URL to the workflow of this monograph.
	 * @private
	 * @type {string?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.workflowUrl_ = null;


	/**
	 * The URL to the public catalog page for this monograph.
	 * @private
	 * @type {string?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.catalogUrl_ = null;


	/**
	 * The URL template used to set the featured status of a monograph.
	 * @private
	 * @type {string?}
	 */
	$.pkp.pages.manageCatalog.MonographHandler.
			prototype.setFeaturedUrlTemplate_ = null;


	//
	// Public Methods
	//
	/**
	 * Get the date published for this monograph.
	 * @return {Date} Date published.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.getDatePublished =
			function() {

		return this.datePublished_;
	};


	/**
	 * Get the featured flag for this monograph.
	 * @return {boolean?} Featured flag.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.getFeatured =
			function() {

		return this.isFeatured_;
	};


	/**
	 * Get the sort sequence for this monograph.
	 * @return {integer?} Sequence.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.getSeq =
			function() {

		return this.seq_;
	};


	/**
	 * Get the ID for this monograph.
	 * @return {integer?} Monograph ID.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.getId =
			function() {

		return this.monographId_;
	};


	//
	// Private Methods
	//
	/**
	 * Get the URL to set a monograph's published state.
	 * @private
	 * @return {String} The URL to use to set the monograph feature state.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.getSetFeaturedUrl_ =
			function() {

		return this.setFeaturedUrlTemplate_
				.replace('FEATURED_DUMMY', this.isFeatured_ ? 1 : 0)
				.replace('SEQ_DUMMY', this.isFeatured_ ?
				this.seq_ : $.pkp.cons.REALLY_BIG_NUMBER);
	};


	/**
	 * Callback that will be activated when "feature" is toggled
	 *
	 * @private
	 *
	 * @return {boolean} Always returns false.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.featureButtonHandler_ =
			function() {

		// Invert "featured" state
		this.isFeatured_ = this.isFeatured_ ? 0 : 1;

		// Tell the server
		$.get(this.getSetFeaturedUrl_(),
				this.callbackWrapper(this.handleSetFeaturedResponse_), 'json');

		// Stop further event processing
		return false;
	};


	/**
	 * Callback that will be activated when the submission workflow action is clicked
	 *
	 * @private
	 *
	 * @return {boolean} Always returns false.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.workflowButtonHandler_ =
			function() {

		if (this.workflowUrl_) {
			document.location = this.workflowUrl_;
		}
		// Stop further event processing
		return false;
	};


	/**
	 * Callback that will be activated when the title of the submission is clicked
	 *
	 * @private
	 *
	 * @return {boolean} Always returns false.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.publicCatalogButtonHandler_ =
			function() {

		if (this.catalogUrl_) {
			document.location = this.catalogUrl_;
		}
		// Stop further event processing
		return false;
	};


	/**
	 * Handle a callback after a "set featured" request returns with
	 * a response.
	 *
	 * @param {Object} ajaxContext The AJAX request context.
	 * @param {Object} jsonData A parsed JSON response object.
	 * @return {boolean} Message handling result.
	 * @private
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.handleSetFeaturedResponse_ =
			function(ajaxContext, jsonData) {

		jsonData = this.handleJson(jsonData);

		// Record the new state of the isFeatured flag and sequence
		this.isFeatured_ = jsonData.content !== null ? 1 : 0;
		this.seq_ = jsonData.content;

		// Update the UI
		var $htmlElement = this.getHtmlElement();
		if (this.isFeatured_) {
			// Now featured; previously not.
			$htmlElement.removeClass('not_sortable')
				.addClass('pkp_helpers_moveicon');
			$htmlElement.find('.star')
				.removeClass('star')
				.addClass('star_highlighted');
		} else {
			// No longer featured.
			$htmlElement.addClass('not_sortable')
				.removeClass('pkp_helpers_moveicon');
			$htmlElement.find('.star_highlighted')
				.addClass('star')
				.removeClass('star_highlighted');
		}

		// Let the container know to reset the sortable list
		this.trigger('monographListChanged');
		return false;
	};


	/**
	 * Handle the "drag mode changed" event to handle drag mode
	 * UI configuration (i.e. the drag icon upon mouseover)
	 *
	 * @private
	 *
	 * @param {$.pkp.controllers.handler.Handler} callingHandler The handler
	 *  that triggered the event.
	 * @param {Event} event The event.
	 * @param {integer} canDrag 1/true iff the user should be able to drag.
	 * @return {boolean} The event handling chain status.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.
			prototype.changeDragModeHandler_ =
			function(callingHandler, event, canDrag) {

		var $htmlElement = this.getHtmlElement();
		if (canDrag) {
			if (!$htmlElement.hasClass('not_sortable')) {
				$htmlElement.addClass('pkp_helpers_moveicon');
			}
		} else {
			$htmlElement.removeClass('pkp_helpers_moveicon');
		}

		// Stop processing
		return false;
	};


	/**
	 * Handle the "set sequence" event to move a monograph
	 *
	 * @private
	 *
	 * @param {$.pkp.controllers.handler.Handler} callingHandler The handler
	 *  that triggered the event.
	 * @param {Event} event The event.
	 * @param {integer} seq New sequence number.
	 * @param {boolean} informServer True if the server should be informed. Default true.
	 * @return {boolean} The event handling chain status.
	 */
	$.pkp.pages.manageCatalog.MonographHandler.
			prototype.setSequenceHandler_ =
			function(callingHandler, event, seq, informServer) {

		// Default param value for informServer: true.
		if (typeof(informServer) === 'undefined') {
			informServer = true;
		}

		// Set the new sequence
		this.seq_ = seq;

		// Inform the server if it's required of us
		if (informServer) {
			$.get(this.getSetFeaturedUrl_(),
					this.callbackWrapper(this.handleSetSequenceResponse_), 'json');
		}

		// Stop processing
		return false;
	};


	/**
	 * Handle a callback after a "set sequence" request returns with
	 * a response.
	 *
	 * @param {Object} ajaxContext The AJAX request context.
	 * @param {Object} jsonData A parsed JSON response object.
	 * @return {boolean} Message handling result.
	 * @private
	 */
	$.pkp.pages.manageCatalog.MonographHandler.prototype.handleSetSequenceResponse_ =
			function(ajaxContext, jsonData) {

		jsonData = this.handleJson(jsonData);

		// We've received a bunch of sequences back; report changes
		this.trigger('monographSequencesChanged', jsonData.content);

		return false;
	};
/** @param {jQuery} $ jQuery closure. */
})(jQuery);

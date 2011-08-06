<?php
/**
 * @defgroup controllers_modal_signoff
 */

/**
 * @file controllers/wizard/fileUpload/FileUploadWizardHandler.inc.php
 *
 * Copyright (c) 2003-2011 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class SignoffHandler
 * @ingroup controllers_modal_signoff
 *
 * @brief A controller that handles basic server-side
 *  operations of the modal/form to signoff on a file.
 */

// Import the base handler.
import('classes.file.FileManagementHandler');

// Import JSON class for use with all AJAX requests.
import('lib.pkp.classes.core.JSONMessage');


class FileSignoffHandler extends FileManagementHandler {
	/** @var integer */
	var $_assocType;

	/** @var integer */
	var $_assocId;

	/** @var string */
	var $_symbolic;

	/** @var int */
	var $_signoffId;

	/**
	 * Constructor
	 */
	function FileSignoffHandler() {
		parent::FileManagementHandler();
		$this->addRoleAssignment(
			array(ROLE_ID_PRESS_MANAGER, ROLE_ID_SERIES_EDITOR, ROLE_ID_PRESS_ASSISTANT, ROLE_ID_AUTHOR),
			array('displayFileUploadForm', 'uploadFile', 'signoff', 'readSignoff')
		);
	}


	//
	// Implement template methods from PKPHandler
	//
	/**
	 * @see PKPHandler::initialize()
	 */
	function initialize(&$request, $args) {
		parent::initialize($request, $args);

		// FIXME: bug #6199
		$this->_assocType = $request->getUserVar('assocType') ? (int)$request->getUserVar('assocType') : null;
		$this->_assocId = $request->getUserVar('assocId') ? (int)$request->getUserVar('assocId') : null;
		$this->_symbolic = $request->getUserVar('symbolic')?$request->getUserVar('symbolic') : null;
		$this->_signoffId = $request->getUserVar('signoffId') ? (int) $request->getUserVar('signoffId') : null;

		// Load translations.
		Locale::requireComponents(array(LOCALE_COMPONENT_OMP_SUBMISSION, LOCALE_COMPONENT_PKP_SUBMISSION, LOCALE_COMPONENT_PKP_COMMON, LOCALE_COMPONENT_APPLICATION_COMMON));
	}


	//
	// Getters and Setters
	//
	/**
	 * Get the assoc type (if any)
	 * @return integer
	 */
	function getAssocType() {
		return $this->_assocType;
	}

	/**
	 * Get the assoc id (if any)
	 * @return integer
	 */
	function getAssocId() {
		return $this->_assocId;
	}

	/**
	 * Get the Symbolic of the signoff (if any)
	 * @return string
	 */
	function getSymbolic() {
		return $this->_symbolic;
	}

	function getSignoffId() {
		return $this->_signoffId;
	}

	//
	// Public handler methods
	//

	/**
	 * Render the file upload form in its initial state.
	 * @param $args array
	 * @param $request Request
	 * @return string a serialized JSON object
	 */
	function readSignoff($args, &$request) {
		// FIXME: #6199
		$signoffId = $request->getUserVar('signoffId');
		$signoffDao =& DAORegistry::getDAO('MonographFileSignoffDAO');
		$signoff =& $signoffDao->getById($signoffId);

		if (!$signoff) {
			$json = new JSONMessage(false);
			return $json->getString();
		}

		// FIXME: do not display this form. Display something similar to the form, but that just has the
		// two file download links (original file and uploaded file if any) and a disabled note
		// with just a close button
		return $this->displayFileUploadForm($args, $request);
	}

	/**
	 * Render the file upload form in its initial state.
	 * @param $args array
	 * @param $request Request
	 * @return string a serialized JSON object
	 */
	function displayFileUploadForm($args, &$request) {
		$monograph =& $this->getMonograph();

		import('controllers.modals.signoff.form.SignoffFileUploadForm');
		$fileForm = new SignoffFileUploadForm(
			$monograph->getId(), $this->getStageId(),
			$this->getSymbolic(), $this->getSignoffId()
		);

		$fileForm->initData($args, $request);

		// Render the form.
		$json = new JSONMessage(true, $fileForm->fetch($request));
		return $json->getString();
	}

	/**
	 * Upload a file and render the modified upload wizard.
	 * @param $args array
	 * @param $request Request
	 * @return string a serialized JSON object
	 */
	function uploadFile($args, &$request) {
		$user =& $request->getUser();

		import('classes.file.TemporaryFileManager');
		$temporaryFileManager = new TemporaryFileManager();
		$temporaryFile = $temporaryFileManager->handleUpload('uploadedFile', $user->getId());
		if ($temporaryFile) {
			$json = new JSONMessage(true);
			$json->setAdditionalAttributes(array(
				'temporaryFileId' => $temporaryFile->getId()
			));
		} else {
			$json = new JSONMessage(false, Locale::translate('common.uploadFailed'));
		}

		return $json->getString();
	}

	/**
	 * Copy the file to the right place (if any) and add the note
	 * @param $args
	 * @param $request
	 * @return string
	 */
	function signoff($args, &$request) {
		// Check for the case the form was displayed with no signoffs
		if ($request->getUserVar('noSignoffs')) {
			$json = new JSONMessage(true);
			return $json->getString();
		}
		$monograph =& $this->getMonograph();

		// Instantiate the file upload form.
		import('controllers.modals.signoff.form.SignoffFileUploadForm');
		$uploadForm = new SignoffFileUploadForm(
			$monograph->getId(), $this->getStageId(),
			$this->getSymbolic(), $this->getSignoffId()
		);
		$uploadForm->readInputData();

		// Validate the form and upload the file.
		if ($uploadForm->validate($request)) {
			$signoffId = $uploadForm->execute($request);
			// FIXME: this is being used for both category grids and file grids
			// if we return the AssocId() it works for category grids, but not file ones
			// if we return the signoffId() it works for file grids, but not the category ones.
			return DAO::getDataChangedEvent();
		} else {
			$json = new JSONMessage(false, array_pop($uploadForm->getErrorsArray()));
		}
		return $json->getString();
	}

	//
	// Private helper methods
	//
	/**
	 * Create an array that describes an uploaded file which can
	 * be used in a JSON response.
	 * @param MonographFile $uploadedFile
	 * @return array
	 */
	function &_getUploadedFileInfo(&$uploadedFile) {
		$uploadedFileInfo = array(
			'uploadedFile' => array(
				'fileId' => $uploadedFile->getFileId(),
				'revision' => $uploadedFile->getRevision()
			)
		);
		return $uploadedFileInfo;
	}
}
?>
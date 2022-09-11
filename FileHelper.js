class FileHelper {
	/**
	 * Save text as file.
	 * @param {string} text File contents.
	 * @param {string} fileName File name.
	 */
	static saveAsFile(text, fileName) {
		// create data URL
		var textBlob = new Blob([text], {
				type: "application/octet-stream"
			});
		var textURL = window.URL.createObjectURL(textBlob);
		// create auto-click link
		const parent = document.body;
		var link = document.createElement("a");
		link.download = fileName;
		link.innerHTML = "Download";
		link.href = textURL;
		link.onclick = function (e) {
			parent.removeChild(e.target);
		};
		link.style.display = "none";
		parent.appendChild(link);
		link.click();
	}
}

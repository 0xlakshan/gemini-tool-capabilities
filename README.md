<p align="center">
	<h1 align="center"><b>Gemini Tool Capabilities
</b></h1>
<p align="center">
    A Gemini tool capability checker that filters text generation models and tests their support for tools
</p>
<br/>
</p>

Google doesn’t currently offer built in tool capability checking, so I created this script to manually test each text-generation model by invoking it directly. The script can accurately detect support for the following tools.
- Google search groudning 
- Code Execution
- File Search
- URL Context

Following issue has been created to potentially get this support in built `models.list()`js API - https://github.com/googleapis/js-genai/issues/1132

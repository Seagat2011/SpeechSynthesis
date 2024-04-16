try {

g_default_frequency = 40.0;
g_default_amplitude = -6.0;
g_default_lineTension = 0.0;
g_bezier_lineTension = 0.3;

// Javascript supports up to 16 decimal places of precision (ie. 3.14159265358979323)
//Math.PI_HiRes = 3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

// Configuration For chart.js plugins

const crossHairPlugin = {
	id: "crossHairPlugin",
	afterDatasetsDraw: function(chart, args, opts) {
		if (chart.crosshair) {
			// Prevent the crosshair from being drawn outside the plot area
			const chartArea = chart.chartArea;
			const minX = chartArea.left;
			const maxX = chartArea.right;
			const minY = chartArea.top;
			const maxY = chartArea.bottom;

			let ctx = chart.ctx;
			let x = clamp(chart.crosshair.x, minX, maxX);
			let y = clamp(chart.crosshair.y, minY, maxY);

			const leftX = chart.scales['x-axis-frame'].left;
			const rightX = chart.scales['x-axis-frame'].right;
			const topY = chart.scales['y-axis-amplitude'].top;
			const bottomY = chart.scales['y-axis-amplitude'].bottom;

			ctx.save();
			ctx.beginPath();

			// Draw new vertical line
			ctx.moveTo(x, topY);
			ctx.lineTo(x, bottomY);
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(140,140,140,0.5)';
			ctx.stroke();

			// Draw new horizontal line
			ctx.moveTo(leftX, y);
			ctx.lineTo(rightX, y);
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(140,140,140,0.5)';
			ctx.stroke();

			// Draw text for X and Y values at the axes
			const xValue = chart.scales['x-axis-frame'].getValueForPixel(x);
			const yValue = chart.scales[(chart.yAxisAmplitudeVisibleFlag) ? 'y-axis-amplitude' : 'y-axis-frequency'].getValueForPixel(y);

			ctx.fillStyle = '#aaa'; // Text color
			ctx.font = '12px roboto'; // Text font and size

			// Text alignment and position adjustments as needed
			ctx.fillText(`#${xValue.toFixed(0)}`, x - 18, 64); // top-most x-axis
			ctx.fillText(`#${xValue.toFixed(0)}`, x - 18, bottomY + 18); // bottom-most x-axis

			if (chart.yAxisAmplitudeVisibleFlag){
				ctx.fillText(`${yValue.toFixed(2)} dBFS`, 19, y);
				// Draw a point at the amplitude intersection
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw a 5px radius point
				ctx.fillStyle = 'rgba(0,0,255,0.7)';
				ctx.fill();
			} else {
				ctx.fillText(`${yValue.toFixed(2)} Hz`, rightX + 10, y);
				// Draw a point at the frequency intersection
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw a 5px radius point
				ctx.fillStyle = 'rgba(0,255,0,0.7)';
				ctx.fill();
			}

			ctx.restore();
		}
	},
};

Chart.register(crossHairPlugin);

Chart.defaults.borderColor = '#444'; // Sets the color of the chart border (default is '#323232')

function updateCrossHair(e) {
	const rect = formant_graph_canvas.getBoundingClientRect();
	const mouseX = e.clientX - rect.left;
	const mouseY = e.clientY - rect.top;

	// Store the mouse position in a variable accessible by Chart.js plugins
	g_formantChart.crosshair = { x: mouseX, y: mouseY };

	/** 
	@details: requestAnimationFrame() A method for telling the browser that you wish to perform a refresh-synced animation,
	g_formantChart.update(): Calls the plugin's afterDatasetsDraw method; redraw the basic chart (removes old crosshairs, 
	calls the plugin's afterDatasetsDraw method) */
	requestAnimationFrame(() => g_formantChart.update());
}

class WaveShape {
	static Sine_enum = 1 << 0;
	static Cosine_enum = 1 << 1;
	static QuarterSine_enum = 1 << 2;
	static HalfSine_enum = 1 << 3;
	static Triangle_enum = 1 << 4;
	static Square_enum = 1 << 5;
	static ForwardSawtooth_enum = 1 << 6;
	static ReverseSawtooth_enum  = 1 << 7;
	static WhiteNoise_enum = 1 << 8;
	static BrownNoise_enum = 1 << 9;
	static PinkNoise_enum = 1 << 10;
	static YellowNoise_enum = 1 << 11;
	static BlueNoise_enum = 1 << 12;
	static GreyNoise_enum = 1 << 13;
	static WhiteGaussianNoise_enum = 1 << 14;
	static PurpleVioletNoise_enum = 1 << 15;
}

class POINT extends Object {
	constructor({ x = 0, y = 0 } = {}) {
		super();
		this.x = x;
		this.y = y;
	}
}

class OSC_INTERVAL extends Object {
	constructor({ amplitude = g_default_amplitude
		, frequency = g_default_frequency
		, frame = 0
		, time_step = 0 } = {}) {
		super();
		this.amplitude = amplitude;
		this.frequency = frequency;
		this.frame = frame;
		this.time_step = time_step;
	}
}

class FORMANTS extends Array {
	constructor({ shape = "Sine"
	, amplitude_as_bezierCurve_flag = false
	, frequency_as_bezierCurve_flag = false } = {}) {
		super(); // Calls the Array constructor
		this.shape = shape; // Adds the shape property
		this.amplitude_as_bezierCurve_flag = amplitude_as_bezierCurve_flag;
		this.frequency_as_bezierCurve_flag = frequency_as_bezierCurve_flag;
		this.undoStack = [];
		this.redoStack = [];
	}
}

Formants = [new FORMANTS({ shape: 'Sine'})];
Formants[0].push(
	new OSC_INTERVAL ({ amplitude: -6.0, frequency: 50.0, frame: 0, time_step: 0 }),
	new OSC_INTERVAL ({ amplitude: -4.5, frequency: 60.0, frame: 200, time_step: 15 }),
	new OSC_INTERVAL ({ amplitude: -4.0, frequency: 65.0, frame: 265, time_step: 30 }),
	new OSC_INTERVAL ({ amplitude: -5.5, frequency: 60.0, frame: 600, time_step: 45 }),
	new OSC_INTERVAL ({ amplitude: -5.8, frequency: 50.0, frame: 880, time_step: 60 }),
	new OSC_INTERVAL ({ amplitude: -6.0, frequency: 40.0, frame: 1040, time_step: 75 }),
	new OSC_INTERVAL ({ amplitude: -7.0, frequency: 30.0, frame: 1300, time_step: 90 }),
	new OSC_INTERVAL ({ amplitude: -11.0, frequency: 20.0, frame: 2000, time_step: 105 })
);

//Formants.prototype = Object.create(Array.prototype);
//Formants.prototype.undoStack = [];
//Formants.prototype.redoStack = [];

g_config = {
	type: 'line',
	data: {
		datasets: [{
			label: 'Amplitude (dBFS)',
			data: Formants[0].map(osc_interval => ({y:osc_interval.amplitude, x:osc_interval.frame})),
			borderColor: 'blue',
			backgroundColor: 'rgb(0, 0, 255)',
			yAxisID: 'y-axis-amplitude',
			xAxisID: 'x-axis-frame',
		}, {
			label: 'Frequency (Hz)',
			data: Formants[0].map(osc_interval => ({y:osc_interval.frequency, x:osc_interval.frame})),
			borderColor: 'green',
			backgroundColor: 'rgb(0, 140, 0)',
			yAxisID: 'y-axis-frequency',
			xAxisID: 'x-axis-frame-dupl',
		}]
	},
	options: {
		scales: {
			'y-axis-amplitude': {
				type: 'linear',
				title: { 
					text: 'dBFS ( Decibels relative to Full Scale )',
					display: true,
				},
				display: true,
				position: 'left',
				grid: {
					drawOnChartArea: true
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						  // call the default formatter, forwarding `this`
						  return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]) + ' dBFS';
					}
				}
			},
			'y-axis-frequency': {
				type: 'linear',
				title: { 
					text: 'Hz',
					display: true,
				},
				display: true,
				position: 'right',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]) + ' Hz';
					}
				}
			},
			'x-axis-frame': {
				type: 'linear',
				title: { 
					text: 'Audio Sample ( Frame ) ',
					display: true,
				},
				display: true,
				position: 'bottom',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]);
					}
				}
			},
			'x-axis-frame-dupl': {
				type: 'linear',
				title: { 
					text: 'Audio Sample ( Frame ) ',
					display: true,
				},
				display: true,
				position: 'top',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]);
					}
				}
			}
		},
		plugins: {
			legend: {
				labels: {
					fontSize: 14 // Legend font size
				}
			},
			tooltip: {
				// Enable custom tooltips
				enabled: true,
				mode: 'index',
				position: 'nearest',
				bodyFontSize: 12, // Tooltip font size
				callbacks: {
					title: function(tooltips, data) {
						// Assuming the first dataset is for amplitude and has complete frame and time_step data
						//const tt = tooltips[0];
						const tt2 = tooltips[1];
						//const tmpTimeStep = tt.label;
						const tmpFrame = tt2.label;
						/*
						const tmpAmplitude = tt.formattedValue;
						const tmpfrequency = tt2.formattedValue;
						*/
						return `Frame: ${tmpFrame}`;
					},
					label: function(tooltipItem, data) {
						// tooltipItem is an object containing properties of the tooltip
						// data is an object containing all data passed to the chart
						let yLabel = tooltipItem.formattedValue;
						const xLabel = tooltipItem.dataset.label;
						if (xLabel.match(/^Amplitude/)) {
							yLabel = `Amplitude: ${yLabel} dBFS`;
						} else if (xLabel.match(/^Frequency/)) {
							yLabel = `Frequency: ${yLabel} Hz`;
						}
						return yLabel;
					}
				}
			},
		},
	}
};

formant_graph_canvas = document.getElementById('formant-graph');

formant_graph_canvas.addEventListener('mousemove', updateCrossHair);

const ctx = formant_graph_canvas.getContext('2d');

g_formantChart = new Chart(ctx, g_config);

g_formantChart.yAxisAmplitudeVisibleFlag = true;

function createSlider(id, label, value, min, max, step, callback) {
	var sliderContainer = document.createElement('div');

	var sliderLabel = document.createElement('label');
	sliderLabel.htmlFor = id;
	sliderLabel.textContent = label + ': ';
	sliderContainer.appendChild(sliderLabel);

	// Add min value spans
	var minValueFrameSpan = document.createElement('span');
	minValueFrameSpan.className = 'min-value';
	minValueFrameSpan.textContent = min.toFixed(2);
	sliderContainer.appendChild(minValueFrameSpan);

	var slider = document.createElement('input');
	slider.type = 'range';
	slider.id = id;
	slider.min = min;
	slider.max = max;
	slider.value = value;
	slider.step = step || '0.01'; // Set step size, eg. '1', '0.01', ... , 'any'
	slider.oninput = function() {
		callback(this.value);
	};
	sliderContainer.appendChild(slider);

	var maxValueFrameSpan = document.createElement('span');
	maxValueFrameSpan.className = 'max-value';
	maxValueFrameSpan.textContent = max.toFixed(2);
	sliderContainer.appendChild(maxValueFrameSpan);

	var output = document.createElement('span');
	output.id = id + '-output';
	output.textContent = value;
	sliderContainer.appendChild(output);

	// Update the output text when the slider value changes
	slider.addEventListener('input', function() {
		output.textContent = slider.value;
	});

	return sliderContainer;
}

function getMaxFrame(i, formant) {
	// TODO: Implement logic to determine the maximum frame allowed based on adjacent points
	// Implement logic to determine the maximum frequency allowed based on adjacent points
	// Placeholder return value
	return formant[i + 1].frame;
}

function getMaxFrequency(i, formant) {
	// TODO: Implement logic to determine the maximum frequency allowed based on adjacent points
	// Implement logic to determine the maximum frequency allowed based on adjacent points
	// Placeholder return value
	return 500.00;
}

function getMaxAmplitude(i, formant) {
	// TODO :Implement logic to determine the maximum amplitude allowed based on adjacent points
	// Placeholder return value
	return 0.00;
}

/**
 * @brief  Function to find and add the nearest element 
 * @param {*} formant  The formant array
 * @param {*} nextOSCINterval  The next OSC_INTERVAL object to be added
 * @returns {boolean}  */
function addPoint(formant, nextOSCINterval) {
	let insertionMade = false;
	// Insert new marker //
	const xValue = nextOSCINterval.frame;
	const I = formant.length;
	for (var i = 0; i < I; ++i) {
		if (formant[i].frame > xValue) { // Insert new marker //
			formant.splice(i, 0, nextOSCINterval);
			insertionMade = true;
			break;
		}
	}

	if (!insertionMade) {
		formant.push(nextOSCINterval);
		insertionMade = true;
	}

	return insertionMade;
}

class AddCommand {
	constructor(formant, data) {
		this.formant = formant;
		this.data = data;
	}

	execute() {
		addPoint(this.formant, this.data);
	}

	undo() {
		removeNearest(this.formant, [this.data.frame]);
	}
}

class RemoveCommand {
	constructor(formant, data) {
		this.formant = formant;
		this.data = data;
	}

	execute() {
		removeNearest(this.formant, [this.data.frame]);
	}

	undo() {
		addPoint(this.formant, this.data);
	}
}

function executeCommand(command) {
	command.execute();
	
	let formant = Formants[g_lastSelectedFormantIndex];

	formant.redoStack = []; // Clear redo stack upon new action //
	formant.undoStack.push(command);

	updateChart(formant);
}

function undo() {
	let formant = Formants[g_lastSelectedFormantIndex];
	
	if (formant.undoStack.length === 0) return;

	const command = formant.undoStack.pop();

	command.undo();

	formant.redoStack.push(command);
	updateChart(formant);
}

function redo() {
	let formant = Formants[g_lastSelectedFormantIndex];

	if (formant.redoStack.length === 0) return;

	const command = formant.redoStack.pop();

	command.execute();

	formant.undoStack.push(command);
	updateChart(formant);
}

// Function to find and remove the nearest element //
function removeNearest(audio_frame, remove_element) {
	let nearestAudioFrameIndex  = 0;
	let nearestValue = audio_frame[0];
	let smallestDiff = Math.abs(audio_frame[0] - remove_element[0]);

	// Find the nearest value
	const I = audio_frame.length;
	for (let i = 1; i < I; ++i) {
		let currentDiff = Math.abs(audio_frame[i] - remove_element[0]);
		if (currentDiff < smallestDiff) {
			smallestDiff = currentDiff;
			nearestAudioFrameIndex = i;
		} else {
			nearestValue = audio_frame[nearestAudioFrameIndex];
			// Remove the nearest value from the array
			let indexToRemove = audio_frame.indexOf(nearestValue);
			if (indexToRemove !== -1) {
				audio_frame.splice(indexToRemove, 1);
			}
			break;
		}
	}
}

function removeDatapoint(audio_frame, remove_element) {
	// Remove the data point from the chart //
	let chart = g_formantChart;
	if (chart.crosshair) {
		// Prevent the crosshair from inserting new points outside the plot area! //
		const chartArea = chart.chartArea;
		const minX = chartArea.left;
		const maxX = chartArea.right;
		const minY = chartArea.top;
		const maxY = chartArea.bottom;

		let x = clamp(chart.crosshair.x, minX, maxX);
		let y = clamp(chart.crosshair.y, minY, maxY);

		// Derive points for X and Y values at the crosshair axes
		const xValue = chart.scales['x-axis-frame'].getValueForPixel(x);
		const yValue = chart.scales[(chart.yAxisAmplitudeVisibleFlag) ? 'y-axis-amplitude' : 'y-axis-frequency'].getValueForPixel(y);

		// Execute the function
		const formant = Formants[g_lastSelectedFormantIndex];
		const remove_element = [xValue, yValue];
		removeNearest(formant, remove_element);

		updateChart(formant);
	} // end if (chart.crosshair)
}

function displaySliders(i, formant) {
	// Reference to the container where sliders will be added //
	var container = slider_container;

	// Clear previous sliders //
	container.innerHTML = '';

	const minFrame = i - 1 in formant ? formant[i-1].frame : formant[i].frame;
	const maxFrame = i + 1 in formant ? formant[i+1].frame : formant[i].frame;

	// Create a slider for the frame index //
	var frameIndexSlider = createSlider(
		  'frameIndex'
		, 'Adjust Frame Index'
		, formant[i].frame
		, minFrame
		, maxFrame
		, "1"
		, function(value) {
			// Update the chart data and re-render //
			let formant = Formants[g_lastSelectedFormantIndex];
			formant[i].frame = value;
			updateChart(formant);
	});

	// Create a slider for frequency
	var frequencySlider = createSlider(
		  'frequency'
		, 'Frequency (Hz)'
		, formant[i].frequency
		, 0.00
		, 500.00
		, "0.01"
		, function(value) {
			// Update the chart data and re-render
			let formant = Formants[g_lastSelectedFormantIndex];
			formant[i].frequency = value;
			updateChart(formant);
	});

	// Create a slider for amplitude
	var amplitudeSlider = createSlider(
		  'amplitude'
		, 'Amplitude (dBFS)'
		, formant[i].amplitude
		,-20.00
		, 0.00
		, "0.01"
		, function(value) {
			// Update the chart data and re-render
			let formant = Formants[g_lastSelectedFormantIndex];
			formant[i].amplitude = value;
			updateChart(formant);
	});

	var deleterTextOption = document.createElement('span');
	deleterTextOption.textContent = 'DELETE';
	deleterTextOption.style.color = 'red';
	deleterTextOption.style.cursor = 'pointer';
	deleterTextOption.onclick = function(e) {
		let formant = Formants[g_lastSelectedFormantIndex];
		const remove_element = formant[i].frame;
		removeNearest(formant, remove_element);
		updateChart(formant);
		hideTAElement();
	};

	// Append the sliders to the parent container
	container.appendChild(frameIndexSlider);
	container.appendChild(frequencySlider);
	container.appendChild(amplitudeSlider);
	container.appendChild(deleterTextOption);

	showTAElement({ jsonINDIR: 'slider' });
}

// Insert a new point at the crosshair //
formant_graph_canvas.addEventListener('click', function(e) {
	// Add a point to the chart //
	let chart = g_formantChart;
	if (chart.crosshair) {
		// Prevent the crosshair from inserting new points outside the plot area
		const chartArea = chart.chartArea;
		const minX = chartArea.left;
		const maxX = chartArea.right;
		const minY = chartArea.top;
		const maxY = chartArea.bottom;

		let x = clamp(chart.crosshair.x, minX, maxX);
		let y = clamp(chart.crosshair.y, minY, maxY);

		// Derive points for X and Y values at the crosshair axes
		const xValue = chart.scales['x-axis-frame'].getValueForPixel(x);
		const yValue = chart.scales[(chart.yAxisAmplitudeVisibleFlag) ? 'y-axis-amplitude' : 'y-axis-frequency'].getValueForPixel(y);

		var formant = Formants[g_lastSelectedFormantIndex];
		var nextOSCINterval = new OSC_INTERVAL({ amplitude: yValue, frequency: g_default_frequency, frame: xValue, time_step: 0 });

		if (!chart.yAxisAmplitudeVisibleFlag) { /* Frequency */
			nextOSCINterval.amplitude = g_default_amplitude;
			nextOSCINterval.frequency = yValue;
		}

		const I = formant.length;
		for (var i = 0; i < I; ++i) {
			if (Math.abs(formant[i].frame - xValue) < 65) { // Edit current marker //
				displaySliders(i, formant);
				break;
			} else if (formant[i].frame > xValue) { // Insert new marker //
				formant.splice(i, 0, nextOSCINterval);
				break;
			}
		}

		updateChart(formant);
	} // end if (chart.crosshair)
});

formant_graph_canvas.addEventListener('mousedown', function(e) {
	// Begin Update for the selected (amplitude/frequency) data point //

});

formant_graph_canvas.addEventListener('mousemove', function(e) {
	// Realtime-Update the selected (amplitude/frequency) data point //

});

formant_graph_canvas.addEventListener('mouseup', function(e) {
	// End Update the selected (amplitude/frequency) data point //

});

formant_graph_canvas.addEventListener('dblclick', function(e) {

});

activeColor = 'green';

// grab the default color of the button
const defaultColor = SineBTN.style.backgroundColor;

function updateActiveRadioButton(rButton) {
	document.querySelectorAll('.radio_button_class').forEach(bttn => {
		if (!bttn) return;
		if (bttn != rButton) {
			bttn.activeFlag = false;
			bttn.style.backgroundColor = defaultColor;
		} else {
			bttn.activeFlag = true;
			bttn.style.backgroundColor = activeColor;
			if (bttn.textContent != Formants[g_lastSelectedFormantIndex].shape) {
				Formants[g_lastSelectedFormantIndex].shape = bttn.textContent;
			}
		}
	});

	const PreviousAmplitudeStatus = AmplitudeBezierBTN.activeFlag;
	const PreviousFrequencyStatus = FrequencyBezierBTN.activeFlag;

	const SmoothAmplitudeActiveFlag = Formants[g_lastSelectedFormantIndex].amplitude_as_bezierCurve_flag 
		? true
		: false;	
	const SmoothFrequencyActiveFlag = Formants[g_lastSelectedFormantIndex].frequency_as_bezierCurve_flag 
		? true
		: false;

	AmplitudeBezierBTN.activeFlag = SmoothAmplitudeActiveFlag ? true : false;
	AmplitudeBezierBTN.style.backgroundColor = SmoothAmplitudeActiveFlag ? activeColor : defaultColor;

	FrequencyBezierBTN.activeFlag = SmoothFrequencyActiveFlag ? true : false;
	FrequencyBezierBTN.style.backgroundColor = SmoothFrequencyActiveFlag ? activeColor : defaultColor;

	const amplitudeCurve = 0;
	const frequencyCurve = 1;

	g_formantChart.data.datasets[amplitudeCurve].lineTension = SmoothAmplitudeActiveFlag ? g_bezier_lineTension : g_default_lineTension ;
	g_formantChart.data.datasets[frequencyCurve].lineTension = SmoothFrequencyActiveFlag ? g_bezier_lineTension : g_default_lineTension ;	

	if(
		   (PreviousAmplitudeStatus != SmoothAmplitudeActiveFlag)
		|| (PreviousFrequencyStatus != SmoothFrequencyActiveFlag)
	){		
		g_formantChart.update();
	}

}

const ShapeButtonMappings = {
	'Sine': SineBTN,
	'Cosine': CosineBTN,
	'Square': SquareBTN,
	'F. Sawtooth': SawBTN,
	'R. Sawtooth': RSawBTN,
	'Triangle': TriangleBTN,
	'Pink Noise': PinkBTN,
	'Purple Noise': PurpleBTN,
	'Brown Noise': BrownBTN,
	'Blue Noise': BlueBTN,
	'White Gaussian Noise': GaussBTN,
};

// Called by the global Formants[].shape to convert its string input. The DOM calls updateActiveRadioButton directly.
function updateShapeBar(u) {
	if (u in ShapeButtonMappings) {
		let ShapeActiveButton = ShapeButtonMappings[u];
		updateActiveRadioButton(ShapeActiveButton);
	}
}

const defaultPCMEncoding = 11; // PCM 24/192 kHz

minimum_allowed_formant_select_elements = 3;
g_lastSelectedFormantIndex = 0;
formant_selector.selectedIndex = 0;
Formants.pcm_encoding = defaultPCMEncoding;
resolution_selector.selectedIndex = defaultPCMEncoding; 
updateShapeBar(Formants[0].Shape);

function updateChart(formant) {
	var tmpConfig = g_config;

	tmpConfig.data.labels = formant.map(osc_interval => osc_interval.frame);
	tmpConfig.data.datasets[0].data = formant.map(osc_interval => osc_interval.amplitude);
	tmpConfig.data.datasets[1].data = formant.map(osc_interval => osc_interval.frequency);

	if (tmpConfig != g_config) {
		g_formantChart = new Chart(ctx, tmpConfig);
		g_config = tmpConfig;
	}

}

function updateFormantSelectElement(ii) {
	const I = Formants.length;
	formant_selector.innerHTML = '';

	// Reconstruct the regular options
	for (var i = 0; i < I; i++) {
		let option = document.createElement('option');
		option.value = i;
		option.textContent = 'F' + i;
		formant_selector.appendChild(option);
	}

	// Add the 'Insert New Formant' option
	let insertOption = document.createElement('option');
	insertOption.classList.add('insert_formant_class');
	insertOption.value = I;
	insertOption.textContent = 'Insert New Formant';
	formant_selector.appendChild(insertOption);

	// Add the 'Remove (Current) Formant' option
	let removeOption = document.createElement('option');
	removeOption.classList.add('remove_current_formant_class');
	removeOption.value = I + 1;
	removeOption.textContent = 'Remove (Current) Formant';
	formant_selector.appendChild(removeOption);

	try {
		formant_selector.selectedIndex = ii;  /* ii = g_lastSelectedFormantIndex */
	} catch (e) {
		console.info(e);
		formant_selector.selectedIndex = 0;
		g_lastSelectedFormantIndex = 0;
	}

}

function insertNewFormant(i) {
	const formant = Formants[i];
	var tmpFormant = new FORMANTS({ shape: formant.shape });
	formant.map(osc_interval => { 
		tmpFormant.push(new OSC_INTERVAL({ amplitude: osc_interval.amplitude
			, frequency: osc_interval.frequency
			, frame: osc_interval.frame
			, time_step: osc_interval.time_step }) );
		return osc_interval;
	});
	g_lastSelectedFormantIndex = i = Formants.push(tmpFormant) - 1;
	updateFormantSelectElement(i);
	updateShapeBar(tmpFormant.shape);
	updateChart(tmpFormant);
}

function removeFormantAt(i) {
	Formants.splice(i-1, 1);
	g_lastSelectedFormantIndex = i = (i - 1 > -1) ? --i : 0;
	updateFormantSelectElement(i);
	var formant = Formants[i];
	updateShapeBar(formant.shape);
	updateChart(formant);
}

// Event listeners for dropdowns

function removeButtonEventListeners() {
	confirmYes.onclick = null; // Remove the event listener itself
	confirmNo.onclick = null; // Remove the event listener itself
}

function showConfirmBox({ message="" }={}) {
	return new Promise((resolve, reject) => {

			// Event handler for OK
			confirmYes.onclick = () => {
				confirmBox.style.display = 'none';
				removeButtonEventListeners();
				resolve(true); // Resolve the promise when OK is clicked
			};

			// Event handler for CANCEL
			confirmNo.onclick = () => {
				confirmBox.style.display = 'none';
				removeButtonEventListeners();
				reject(false); // Reject the promise when CANCEL is clicked
			};

			if (message != "") {
				messageCaption.textContent = message;
			}

			confirmBox.style.display = 'block';

		});
}

resolution_selector.addEventListener('change', function() {
	Formants.pcm_encoding = resolution_selector.selectedIndex;
});

formant_selector.addEventListener('change', function() {

	const selectedIndex = this.selectedIndex;
	const current_formant_count = this.options.length;
	const selectedOptionClassList = this.options[this.selectedIndex].classList;

	if (selectedOptionClassList.contains('insert_formant_class')) {
		insertNewFormant(g_lastSelectedFormantIndex);
	} else if (
		selectedOptionClassList.contains('remove_current_formant_class') 
		&& current_formant_count > minimum_allowed_formant_select_elements) {
		removeFormantAt(g_lastSelectedFormantIndex);
	} else {
		g_lastSelectedFormantIndex = selectedIndex;
		const formant = Formants[g_lastSelectedFormantIndex];
		updateChart(formant);
		updateShapeBar(formant.shape);
	}

});

/* Button Actions */

SineBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

CosineBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

SquareBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

SawBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

RSawBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

TriangleBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

PinkBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

PurpleBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

BrownBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

BlueBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

GaussBTN.addEventListener('click', function() {
	updateActiveRadioButton(this);
});

function updateActiveBezierRadioButton(rButton, audioComponent) {
	if (rButton.activeFlag) {
		rButton.activeFlag = false;
		rButton.style.backgroundColor = defaultColor;
	} else {
		rButton.activeFlag = true;
		rButton.style.backgroundColor = activeColor;
	}

	const amplitudeCurve = 0;
	const frequencyCurve = 1;
	const activeFlag = rButton.activeFlag;
	switch (audioComponent) {

		case "amplitude":
		g_formantChart.data.datasets[amplitudeCurve].lineTension = activeFlag ? g_bezier_lineTension : g_default_lineTension ;
		Formants[g_lastSelectedFormantIndex].amplitude_as_bezierCurve_flag = activeFlag;
		g_formantChart.update();
		break;

		case "frequency":
		g_formantChart.data.datasets[frequencyCurve].lineTension = activeFlag ? g_bezier_lineTension : g_default_lineTension ;
		Formants[g_lastSelectedFormantIndex].frequency_as_bezierCurve_flag = activeFlag;
		g_formantChart.update();
		break;

		default:
		return;
	}
}

AmplitudeBezierBTN.addEventListener('click', function() {
	updateActiveBezierRadioButton(this, "amplitude");
});

FrequencyBezierBTN.addEventListener('click', function() {
	updateActiveBezierRadioButton(this, "frequency");
});

/** Audio Frame options */

const audioFrame_sizes = {
	"0":1,
	"1":2,
	"2":5,
	"3":10,
	"4":25,
	"5":100,
	"6":200,
	"7":400,
	"8":1000,
	"9":2500,
	"10":5000,
	"11":11025,
	"12":22050,
	"13":48000,
	"14":92025,
	"15":96000,
	"16":192000,
	"17":384000,
	"18":768000
};

add_frames_selector.addEventListener('change', function() {

});

remove_frames_selector.addEventListener('change', function() {

});

AddFramesBTN.addEventListener('click', function() {
	try {
		var formant = Formants[g_lastSelectedFormantIndex];
		const dx = audioFrame_sizes[add_frames_selector.selectedIndex];
		const I = formant.length;
		var lastOSCInterval = formant[I - 1];

		// TODO: Re-sample the audio (scale the frame property of each OSC_INTERVAL object by the new overall length)
		// TODO: Adjust te length for all formant curves

		const nextOSCINterval_frame = lastOSCInterval.frame + dx;
		const nextOSCInterval_time_step = lastOSCInterval.time_step;
		formant.push(new OSC_INTERVAL({
			  amplitude: g_default_amplitude
			, frequency: g_default_frequency
			, frame: nextOSCINterval_frame
			, time_step: nextOSCInterval_time_step }) );
		updateChart(formant);
	} catch (e) {
		console.info(`Frame insertion error: ${e}`);
	}
});

RemoveFramesBTN.addEventListener('click', function() {
	try {
		var formant = Formants[g_lastSelectedFormantIndex];
		const dx = audioFrame_sizes[remove_frames_selector.selectedIndex];
		const I = formant.length;
		var lastOSCInterval = formant[I - 1];

		// TODO: Re-sample the audio (scale the frame property of each OSC_INTERVAL object by the new overall length)
		// TODO: Adjust te length for all formant curves

		const lastOSCInterval_frame = lastOSCInterval.frame - dx;

		if (lastOSCInterval_frame < 0) {
			console.info('Frame removal error: Invalid frame count.');
			return;
		} else {
			var i = 0;
			var removeElementFlag = false;
			while (i < I) {
				if (!removeElementFlag && formant[i].frame > lastOSCInterval_frame) {
					formant[i].frame = lastOSCInterval_frame;
					removeElementFlag = true;
				} else if (removeElementFlag) {
					formant.pop();
				}
				++i;
			}
			updateChart(formant);
		}
	} catch (e) {
		console.info('Frame removal error: Invalid frame count for removal.');
		console.info(e);
	}
});

// Show/Hide JSON Text Area Element
function showTAElement({ jsonINDIR = 'out' }={}) {
	switch (jsonINDIR) {
		case 'in':
		JsonTA.style.display = 'block';
		json_form_class.style.display = 'block';
		jsonFORM.style.display = 'inline-block';
		jsonFORM.jsonIndirection = jsonINDIR;
		waveform_container.style.display = 'none';
		break;

		case 'out':
		JsonTA.style.display = 'inline-block';
		json_form_class.style.display = 'block';
		jsonFORM.style.display = 'none';
		jsonFORM.jsonIndirection = jsonINDIR;
		waveform_container.style.display = 'none';
		break;

		case 'slider':
		slider_container.style.display = 'inline-block';
		waveform_container.style.display = 'none';
		JsonTA.style.display = 'none';
		break;

		case 'waveform':
		JsonTA.style.display = 'none';
		jsonFORM.style.display = 'none';
		slider_container.style.display = 'none';
		waveform_container.style.display = 'inline-block';
		break;
	}

	// Show the popup container
	popupContainer.style.display = 'flex';
}

// Show/Hide JSON Text Area Element
function hideTAElement() {
	popupContainer.style.display = 'none';
	json_form_class.style.display = 'none';
	jsonFORM.style.display = 'none';
	jsonFORM.jsonIndirection = 'none';
	JsonTA.style.display = 'none';
	slider_container.style.display = 'none';
	waveform_container.style.display = 'none';
}

CloseJsonBTN.addEventListener('click', function() {
	hideTAElement();
});

InJsonBTN.addEventListener('click', function() {
	JsonTA.value = '';
	showTAElement({ jsonINDIR: 'in' });
});

function serializeCustomObject(obj) {
	let result = "{";
	let properties = [];

	for (let property in obj) {
		if (
			obj.hasOwnProperty(property)
			&& property !== 'undoStack'
			&& property !== 'redoStack') {
			let value = obj[property];

			// Handling non-primitive types (like another object)
			if (typeof value === 'object' && value !== null) {
				value = serializeCustomObject(value); // Recursive call
			} else if (typeof value === 'string') {
				value = `"${value}"`; // Add quotes for strings
			}

			properties.push(`"${property}": ${value}`);
		}
	}

	result += properties.join(", ");
	result += "}";
	return result;
}

const pcm_encoding_docstring_options = {
    "0": {
        "pcm_encoding_docstring": "PCM 16-bit/44 KHz",
        "bit_depth": 16,
        "sample_rate": 44.1,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "1": {
        "pcm_encoding_docstring": "PCM 16-bit/48 KHz",
        "bit_depth": 16,
        "sample_rate": 48,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "2": {
        "pcm_encoding_docstring": "PCM 16-bit/88 KHz",
        "bit_depth": 16,
        "sample_rate": 88.2,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "3": {
        "pcm_encoding_docstring": "PCM 16-bit/96 KHz",
        "bit_depth": 16,
        "sample_rate": 96,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "4": {
        "pcm_encoding_docstring": "PCM 16-bit/192 KHz",
        "bit_depth": 16,
        "sample_rate": 192,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "5": {
        "pcm_encoding_docstring": "PCM 16-bit/384 KHz",
        "bit_depth": 16,
        "sample_rate": 384,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "6": {
        "pcm_encoding_docstring": "PCM 16-bit/768 KHz",
        "bit_depth": 16,
        "sample_rate": 768,
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96
    },
    "7": {
        "pcm_encoding_docstring": "PCM 24-bit/44 KHz",
        "bit_depth": 24,
        "sample_rate": 44.1,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144
    },
    "8": {
        "pcm_encoding_docstring": "PCM 24-bit/48 KHz",
        "bit_depth": 24,
        "sample_rate": 48,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144
    },
	"9": {
		"pcm_encoding_docstring": "PCM 24-bit/88 KHz",
		"bit_depth": 24,
		"sample_rate": 88.2,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
	"10": {
		"pcm_encoding_docstring": "PCM 24-bit/96 KHz",
		"bit_depth": 24,
		"sample_rate": 96,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
	"11": {
		"pcm_encoding_docstring": "PCM 24-bit/192 KHz",
		"bit_depth": 24,
		"sample_rate": 192,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
	"12": {
		"pcm_encoding_docstring": "PCM 24-bit/384 KHz",
		"bit_depth": 24,
		"sample_rate": 384,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
	"13": {
		"pcm_encoding_docstring": "PCM 24-bit/768 KHz",
		"bit_depth": 24,
		"sample_rate": 768,
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
	"14": {
		"pcm_encoding_docstring": "PCM 32-bit/44 KHz",
		"bit_depth": 32,
		"sample_rate": 44.1,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"15": {
		"pcm_encoding_docstring": "PCM 32-bit/48 KHz",
		"bit_depth": 32,
		"sample_rate": 48,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"16": {
		"pcm_encoding_docstring": "PCM 32-bit/88 KHz",
		"bit_depth": 32,
		"sample_rate": 88.2,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"17": {
		"pcm_encoding_docstring": "PCM 32-bit/96 KHz",
		"bit_depth": 32,
		"sample_rate": 96,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"18": {
		"pcm_encoding_docstring": "PCM 32-bit/192 KHz",
		"bit_depth": 32,
		"sample_rate": 192,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"19": {
		"pcm_encoding_docstring": "PCM 32-bit/384 KHz",
		"bit_depth": 32,
		"sample_rate": 384,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"20": {
		"pcm_encoding_docstring": "PCM 32-bit/768 KHz",
		"bit_depth": 32,
		"sample_rate": 768,
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
	"21": {
		"pcm_encoding_docstring": "PCM 64-bit/44 KHz",
		"bit_depth": 64,
		"sample_rate": 44.1,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 },
	"22": {
		"pcm_encoding_docstring": "PCM 64-bit/48 KHz",
		"bit_depth": 64,
		"sample_rate": 48,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 },
	"23": {
			"pcm_encoding_docstring": "PCM 64-bit/88 KHz",
			"bit_depth": 64,
			"sample_rate": 88.2,
			"dynamic_range_dBFS": 385.28,
			"saturation_value_dBFS": -385 },
	"24": {
		"pcm_encoding_docstring": "PCM 64-bit/96 KHz",
		"bit_depth": 64,
		"sample_rate": 96,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 },
	"25": {
		"pcm_encoding_docstring": "PCM 64-bit/192 KHz",
		"bit_depth": 64,
		"sample_rate": 192,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 },
	"26": {
		"pcm_encoding_docstring": "PCM 64-bit/384 KHz",
		"bit_depth": 64,
		"sample_rate": 384,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 },
	"27": {
		"pcm_encoding_docstring": "PCM 64-bit/768 KHz",
		"bit_depth": 64,
		"sample_rate": 768,
		"dynamic_range_dBFS": 385.28,
		"saturation_value_dBFS": -385 }
		
};

/**
@brief The safe dBFS values for saturation to -Infinity dBFS, based on different PCM bit depths. 
@details The safe dBFS values for saturation to -Infinity dBFS based on different PCM bit depths 
are determined by the theoretical dynamic range of each bit depth. The dynamic range in dB 
for a given bit depth can be approximated using the formula:

Dynamic Range (dB) = 6.02 * Bit Depth

This formula derives from the fact that each bit in a digital audio system increases 
the dynamic range by approximately 6.02 dB, representing the resolution increase afforded 
by each additional bit. Here's how this applies to the bit depths you mentioned:

Let's calculate the dynamic ranges and then derive the safe dBFS values for saturation 
to -Infinity dBFS for each bit depth: 11, 16, 24, 32, and 64. */
const pcm_bit_depth_encoding_recommended_dBFS_saturation_values = {
    "16": {
        "dynamic_range_dBFS": 96.32,
        "saturation_value_dBFS": -96 },
    "24": {
        "dynamic_range_dBFS": 144.48,
        "saturation_value_dBFS": -144 },
    "32": {
        "dynamic_range_dBFS": 192.64,
        "saturation_value_dBFS": -193 },
    "64": {
        "dynamic_range_dBFS": 385.28,
        "saturation_value_dBFS": -385 }
};

OutJsonBTN.addEventListener('click', function() {
	let jsonData = Formants; /*g_formantChart.data;*/
	if ( !('phoneme_name' in jsonData) ) {
		jsonData.phoneme_name = 'n/a';
	}
	jsonData.pcm_encoding_docstring = pcm_encoding_docstring_options[jsonData.pcm_encoding].pcm_encoding_docstring;
	let json = serializeCustomObject(jsonData);
	JsonTA.value = json;
	showTAElement({ jsonINDIR: 'out' });
});

/** Object window actions */

Object.prototype.last = function(){
	let self = this;
	const I = self.length-1;

	return self[I];
};

/** trigonometric functions */

class FWaveform extends Object {
	//public:
	//FWaveform() = default;

	constructor()
	{
		super();
		/*
		this.amplitude = -6.5;
		this.frequency = 40.0;
		this.time_step = 0.0;
		this.phase = 0.0;
		this.shape = "Sine";
		*/
	   this.RAND_MAX = 0x7fff; // #define RAND_MAX 32767 (stdlib.h)
	}

	/**
	@brief Generates a Sine wave.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@param timeStep_constDouble: The time-step (t) at which the oscillator is to be evaluated.
	@param theta_constDouble: The phase of the oscillator signal.
	@return double ( The oscillator signal at time-step t).*/
	SIN(params)
	{

		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency;
		const timeStep_constDouble = params.time;
		const theta_constDouble = params.phase;
		const sampleRate = params.sampleRate; // already factored into frequency //

		// Generate the signal with interpolated parameters //
		const result = amplitude_constDouble * Math.sin(2 * Math.PI * frequencyHz_double / params.TIME * timeStep_constDouble + theta_constDouble);

		return result;
	}

	/**
	@brief Generates a Sine wave.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@param timeStep_constDouble: The time-step (t) at which the oscillator is to be evaluated.
	@param theta_constDouble: The phase of the oscillator signal.
	@return double ( The oscillator signal at time-step t).*/
	sine(params) {

		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency;
		const timeStep_constDouble = params.time;
		const theta_constDouble = params.phase;
		const sampleRate = params.sampleRate; // already factored into frequency //

		const result = amplitude_constDouble * Math.sin(2 * PI_HiRes * frequencyHz_double / params.TIME * timeStep_constDouble + theta_constDouble);

		return result;
	}

	/**
	@brief Generates a Quarter-Sine wave.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@param timeStep_constDouble: The time-step (t) at which the oscillator is to be evaluated.
	@param theta_constDouble: The phase of the oscillator signal.
	@param quarterPeriod_constDouble: The quarter-period of the oscillator signal.
	@return double ( The oscillator signal at time-step t).*/
	quarterSine(params) {
		
		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency
		const timeStep_constDouble = params.time;
		const theta_constDouble = params.phase;
		const sampleRate = params.sampleRate; // already factored into frequency //

		const quarterPeriod_constDouble = 1 / (4 * frequencyHz_double);

		const result = amplitude_constDouble * Math.sin(
			2 * PI_HiRes * Math.fmod(
			Math.abs(frequencyHz_double / params.TIME * timeStep_constDouble)
			, quarterPeriod_constDouble) 
			+ theta_constDouble);
		
		return result;
	}

	/**
	@brief Generates a Half-Sine wave.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@param timeStep_constDouble: The time-step (t) at which the oscillator is to be evaluated.
	@param theta_constDouble: The phase of the oscillator signal.
	@return double (The oscillator signal at time-step, t). */
	halfSine(params) {
		
		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency
		const timeStep_constDouble = params.time;
		const theta_constDouble = params.phase;
		const sampleRate = params.sampleRate; // already factored into frequency //

		const halfPeriod_constDouble = 1 / (2 * frequencyHz_double);
		
		const result = amplitude_constDouble * Math.sin(
			2 * PI_HiRes * Math.fmod(
			Math.abs(frequencyHz_double / params.TIME * timeStep_constDouble)
			, halfPeriod_constDouble) 
			+ theta_constDouble);

		return result;
	}
	
	/**
	@brief  Generates a sawtooth signal.
	@param {*} t  The current time in milliseconds
	@param {*} start  The minimum value of the sawtooth wave
	@param {*} end  The maximum value of the sawtooth wave
	@param {*} period  The period of the sawtooth wave
	@param {*} indirection  The indirection of the sawtooth wave ('forwards' or 'backwards')
	@returns  The value of the sawtooth wave at the current time
	* 
	*  	// Example usage
		const now = performance.now(); // Get current time in milliseconds
		const signalValue = generateSawtooth(now, 0, 1, 2000); // 2 second period
		console.log(signalValue);  */
	sawtooth(
		  params
		, indirection = 'forwards') {
		
		const t = params.time;
		const min = params.amplitudeStart;
		const max = params.amplitudeEnd;
		const period = 1/params.frequency;
		
		const normalizedTime = (t % period) / period; // Keep time within a period //

		// Linear interpolation for rising edge //
		const value = indirection === 'forwards'
			? min + (max - min) * normalizedTime
			: max - (max - min) * normalizedTime; 

		return value;
	}
	
	/**
	@brief  Generates a triangle wave signal.
	@param {*} t  The current time in milliseconds
	@param {*} start  The minimum value of the triangle wave
	@param {*} end  The maximum value of the triangle wave
	@param {*} period  The period of the triangle wave
	@returns  The value of the triangle wave at the current time
	* 
	*   // Example usage
		const now = performance.now(); // Get current time in milliseconds
		const signalValue = generateTriangle(now, 0, 1, 2000); // 2 second period
		console.log(signalValue);  */
	triangle(params) {
	
		const t = params.time;
		const min = params.amplitudeStart;
		const max = params.amplitudeEnd;
		const period = 1/params.frequency;
		
		const normalizedTime = (t % period) / period; // Normalize time within a period

		// Calculate slope for linear interpolation based on wave direction
		const slope = (max - min) * 4 / period;

		let value;

		if (normalizedTime < 0.5) {
			// Falling edge first if indirection is backwards
			value = max - slope * (t % (period / 2));
		} else {
			// Then rising edge
			value = min + slope * (t % (period / 2));
		}

		return value;
	}

	/**
	@brief  Generates a square wave signal.
	@param {*} t  The current time in milliseconds
	@param {*} start  The minimum value of the square wave
	@param {*} end  The maximum value of the square wave
	@param {*} period  The period of the square wave
	@returns  The value of the square wave at the current time
	* 
	*   // Example usage
		const now = performance.now(); // Get current time in milliseconds
		const signalValue = generateSquare(now, 0, 1, 2000); // 2 second period
		console.log(signalValue);  */
	square(params) {
	
		const t = params.time;
		const min = params.amplitudeStart;
		const max = params.amplitudeEnd;
		const period = 1/params.frequency;
		
		const normalizedTime = (t % period) / period; // Normalize time within a period
			
		const value = normalizedTime >= 0.5 
		? max // Output max value for the first half and min value for the second half of the period
		: min; // Reverse the logic for backwards indirection

		return value;
	}

	/**
	@brief  Generates white Gaussian noise.
	@param {number} amplitude_constDouble - Standard deviation of the normal distribution.
	@returns {number} A random number following a Gaussian distribution.*/
	whiteGaussianNoise(params) {

		const amplitude_constDouble = params.amplitude;

		const epsilon = 0.0001; //1e-10; // A small positive constant to prevent u or v from being zero

		let u = Math.random();
		let v = Math.random();

		// Ensure u and v are not zero by adding a small constant
		//   Converting [0,1) to (0,1)
		u = (u === 0) ? epsilon : u;
		v = (v === 0) ? epsilon : v;

		// Performing the Box-Muller transform
		const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

		return z * amplitude_constDouble;
	}

    static basePeriod = 0.01;             // Average period in seconds
    static periodVariation = 0.1;         // Degree of irregularity (0-1)
    static pulseWidth = 0.2;              // Pulse width relative to period (0-1)
    static filterCutoff = 800;            // Low-pass filter cutoff frequency (Hz)
    static quasiPeriodicTime = 0;         // Current time in seconds
    static prevNoiseValue = 0;            // For smooth transitions
    static nextPeriodChangeTime = 0;      // Time for the next period change
    static currentPeriod = FWaveform.basePeriod * (1 + FWaveform.periodVariation * (2 * Math.random() - 1)); // Initialize the period

    /**
    @brief Generates the next value of quasi periodic (pink) noise signal.
	@details Generates the next value of quasi periodic (pink) noise signal.
    @param {*} sampleRate The sample rate of the noise signal in Hz
    @returns The next value in the generated noise signal */
    static quasiPeriodicNoise(params) {

		const sampleRate = params.sampleRate;

        if (FWaveform.quasiPeriodicTime >= FWaveform.nextPeriodChangeTime) {
            FWaveform.currentPeriod = 
				FWaveform.basePeriod 
					* (1 + FWaveform.periodVariation 
						* (2 * Math.random() - 1));

            FWaveform.nextPeriodChangeTime += FWaveform.currentPeriod;
        }

        let output;
        if (FWaveform.quasiPeriodicTime % FWaveform.currentPeriod < FWaveform.pulseWidth * FWaveform.currentPeriod) {
            let noiseValue = 2 * Math.random() - 1;

            // Simple low-pass filtering
            noiseValue = (noiseValue + FWaveform.prevNoiseValue) * 0.5;

            FWaveform.prevNoiseValue = noiseValue;

            output = noiseValue;
        } else {
            output = 0;
        }

        FWaveform.quasiPeriodicTime += 1 / sampleRate;

        return output;

    }

	static brownNoiseValue_double = 0;
	static lastBrownNoiseValue_double = 0;
	static brownNoiseIncrement_double = 0;
	static brownNoiseDecay_double = 0;

	/**
	@brief Generate a brownian noise signal.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@return double */
	brownNoise(params) {

		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency;

		if (FWaveform.brownNoiseIncrement_double == 0.0) {
			FWaveform.brownNoiseIncrement_double = 1.0 / (frequencyHz_double * 0.1);
			FWaveform.brownNoiseDecay_double = Math.exp(-1.0 / (frequencyHz_double * 0.1));
		}

		FWaveform.brownNoiseValue_double = 
			(FWaveform.brownNoiseValue_double 
				+ FWaveform.brownNoiseIncrement_double 
					* (2.0 * (Math.random() / FWaveform.RAND_MAX) - 1.0)) 
						* FWaveform.brownNoiseDecay_double;
		
		const result = 
			amplitude_constDouble 
				* (FWaveform.brownNoiseValue_double 
					- FWaveform.lastBrownNoiseValue_double);

		return result;
	};

	static pinkNoiseValue = 0;
	static lastPinkNoiseValue = 0;
	static pinkNoiseIncrement = 0;
	static pinkNoiseDecay = 0;

	/**
	@brief Generates pink noise.
	@details Generates pink noise.
	@param {number} amplitude - The amplitude of the oscillator signal.
	@param {number} frequencyHz - The frequency of the oscillator signal in Hertz.
	@return {number} The generated pink noise value.*/
	pinkNoise(params) {

		const amplitude = params.amplitude;
		const frequencyHz = params.frequency;

		if (FWaveform.pinkNoiseIncrement === 0) {
			FWaveform.pinkNoiseIncrement = 1.0 / (frequencyHz * 0.1);
			FWaveform.pinkNoiseDecay = Math.exp(-1.0 / (frequencyHz * 0.1));
		}

		// Generating a random number between -1 and 1
		const randomFactor = 2.0 * Math.random() - 1.0;

		FWaveform.pinkNoiseValue = (FWaveform.pinkNoiseValue + FWaveform.pinkNoiseIncrement * randomFactor) * FWaveform.pinkNoiseDecay;

		const retPinkNoiseValue = amplitude * (FWaveform.pinkNoiseValue - FWaveform.lastPinkNoiseValue);

		FWaveform.lastPinkNoiseValue = FWaveform.pinkNoiseValue;

		return retPinkNoiseValue;
	}

	static blueNoiseValue_double = 0;
	static lastBlueNoiseValue_double = 0;
	static blueNoiseIncrement_double = 0;
	static blueNoiseDecay_double = 0;

	/**
	@brief Generate a blue noise signal.
	@param amplitude_constDouble: The amplitude of the oscillator signal.
	@param frequencyHz_double: The frequency of the oscillator signal.
	@param timeStep_constDouble: The time-step (t) at which the oscillator is to be evaluated.
	@return double */
	blueNoise(params) {
		
		const amplitude_constDouble = params.amplitude;
		const frequencyHz_double = params.frequency;
		const timeStep_constDouble = params.time;

		if (FWaveform.blueNoiseIncrement_double == 0.0) {
			FWaveform.blueNoiseIncrement_double = 1.0 / (frequencyHz_double * 0.1);
			FWaveform.blueNoiseDecay_double = Math.exp(-1.0 / (frequencyHz_double * 0.1));
		}

		FWaveform.blueNoiseValue_double = 
			(FWaveform.blueNoiseValue_double 
				+ FWaveform.blueNoiseIncrement_double 
					* (2.0 * (Math.random() / FWaveform.RAND_MAX) - 1.0)) 
						* FWaveform.blueNoiseDecay_double;
		
		const result = 
			amplitude_constDouble 
				* (FWaveform.blueNoiseValue_double 
					- FWaveform.lastBlueNoiseValue_double);

		return result;
	}

	static lastWhite = 0;

	/**
	@brief Generate a purple (violet) noise signal.
	@return double */
	purpleVioletNoise() {
		// Generate new white noise sample
		// Math.random() generates a value between 0 and 1, so we adjust it to get a range similar to a standard normal distribution
		const newWhite = (Math.random() * 2 - 1); 

		// Differentiate to get violet noise
		const violet = newWhite - FWaveform.lastWhite;

		// Update the last white noise sample
		FWaveform.lastWhite = newWhite;

		return violet;
	}
} // end of FWaveform

/**
@brief linear spline (interpolation) function.
@details linear spline (interpolation) function.
@param pts - The formant object.
@param dt - The frame to interpolate.
@param audio_component - The audio component to interpolate (eg. 'amplitude' or 'frequency').
@returns point */
function linear_spline_interpolation (pts,dt,audio_component) {
	if (pts.length == 0 )
		throw ("runtime_error: Not enough frames for linear interpolation within the specified oscillator interval.");

	// Find the interval [x_i, x_i+1] that contains x
	const I = pts.length-1;
	const II = pts.length-2;
	for (let i = 0; i < II; ++i) {
		const frame_1 = pts[i].frame;
		const frame_2 = pts[i+1].frame;
		const audio_component_1 = audio_component === "amplitude" ? pts[i].amplitude : pts[i].frequency ;
		const audio_component_2 = audio_component === "amplitude" ? pts[i+1].amplitude : pts[i+1].frequency ;
		if (dt > frame_1 && dt < frame_2) {
			const dt = (dt - audio_component_1) / (audio_component_1 - frame_2);
			return (1 - dt) * audio_component_1 + dt * audio_component_2;
		}
	}

	// Handle extrapolation cases
	const frame_1 = pts[0].frame;
	const frame_2 = pts[I].frame;
	const audio_component_1 = audio_component === "amplitude" ? pts[0].amplitude : pts[0].frequency ;
	const audio_component_2 = audio_component === "amplitude" ? pts[I].amplitude : pts[I].frequency ;
	if (dt <= frame_1) {
		return  audio_component_1;
	} else if (dt >= frame_2) {
		return  audio_component_2;
	}

	throw ("runtime_error: unspecfied (linear) spline interpolation error.");
} // end of linear_spline_interpolation

/**
@brief Utility module for sinusoidal spline interpolation
@details Utility module for sinusoidal spline interpolation  */
const interpolationUtils = {

	/**
	@brief Ensures that there are enough points for interpolation.
	@details Throws an exception if there aren't enough points for sinusoidal interpolation.
			 This is a static utility method used to validate the size of the points array
			 before performing interpolation operations.
	@param pts Pointer to the first element of an array of FormantPoint.
	@param idx The current index within the points array to check for sufficient subsequent points.
	@throws std::runtime_error if there are not enough points for interpolation. 
	ensureEnoughPoints: function(pts, idx) {
		if (!(idx + 2 in pts)) {
			throw new Error("runtime_error: Not enough inter-frame interpolation\
			steps for sinusoidal interpolation within the specified oscillator interval: [0, 1]");
		}
	},*/

	/**
	@brief Calculates the sinusoidal value based on amplitude, frequency, and time.
	@details Uses the cosine function to calculate the sinusoidal value, representing
			 the value of the waveform at a given time based on its amplitude and frequency.
	@param amp The amplitude of the waveform.
	@param freq The frequency of the waveform.
	@param ts The time stamp at which to calculate the waveform's value.
	@return The calculated sinusoidal value. */
	calculateSinusoidalValue: function(amp, freq, ts) {
		return amp * Math.cos(Math.PI * (freq * ts));
	},

	/**
	@brief Calculates the interpolation factor between two frames.
	@details Determines the relative position of an intermediate frame within the interval
			 defined by a starting and ending frame.
	@param frameStart The normalized start frame value.
	@param frameEnd The normalized end frame value.
	@param iframe The intermediate frame whose position is to be determined.
	@return The interpolation factor of the intermediate frame within the start and end frame interval. */
	getInterpolationFactor: function(frameStart, frameEnd, iframe) {
		return Math.abs((iframe - frameStart) / (frameEnd - frameStart));
	},

	/**
	@brief Performs linear interpolation (LERP) between two values.
	@details Calculates a value linearly interpolated between a start and end value,
			 based on a given factor that indicates the relative position between the two.
	@param start The start value for interpolation.
	@param end The end value for interpolation.
	@param factor The factor indicating the position between the start and end values.
	@return The interpolated value. */
	LERP: function(start, end, factor) {
		return (1 - factor) * start + factor * end;
	}

};

/**
@brief Calculates the ratio of an intermediate frame between two frames.
@details Determines the relative position of an intermediate frame within the intervals
		 defined by either the start to intermediate frame or the intermediate to end frame,
		 depending on the position of the intermediate frame.
@param frameStart The start frame of the interval.
@param intermediateFrame The intermediate frame whose ratio is to be calculated.
@param frameEnd The end frame of the interval.
@param iframe The frame to interpolate, normalized to the range [0.0, 1.0].
@return The calculated ratio of the intermediate frame within the specified interval.*/
function calculateRatioBetweenFrames(frameStart, intermediateFrame, frameEnd, iframe) {
	return iframe >= intermediateFrame
	? interpolationUtils.getInterpolationFactor(intermediateFrame, frameEnd, iframe)
	: interpolationUtils.getInterpolationFactor(frameStart, intermediateFrame, iframe);
}

function has_shape(a,b) {
	return (a & b) !== 0;
}

// class to encapsulate wave-shape parameters //
class BLEND_STRATEGY
{
	static LERP = 1 << 1;
	static CUBIC = 1 << 2;
	static QUARTIC = 1 << 3;
}

// class to encapsulate SIN, etc. parameters //
class signalParameters extends Object
{
	constructor() {
		super();

		this.time = 0;
		this.TIME = 0;
		this.deltaTime = 0;
		this.amplitude = 0;
		this.amplitudeStart = 0;
		this.amplitudeEnd = 0;
		this.amplitudeBlendStartFrame = 0;
		this.amplitudeBlendEndFrame = 0;
		this.amplitudeBlendStrategy = BLEND_STRATEGY.LERP;
		this.frequency = 0;
		this.frequencyStart = 0;
		this.frequencyEnd = 0;
		this.frequencyBlendStartFrame = 0;
		this.frequencyBlendEndFrame = 0;
		this.frequencyBlendStrategy = BLEND_STRATEGY.LERP;
		this.phase = 0;
		this.phaseStart = 0;
		this.phaseEnd = 0;
		this.phaseBlendStartFrame = 0;
		this.phaseBlendEndFrame = 0;
		this.phaseBlendStrategy = BLEND_STRATEGY.LERP;
		this.cumulativePhase = 0;
	}
}

/**
 * @brief Generates a signal based on specific wave-shape parameters.
 * @details Generates a signal based on specific wave-shape parameters.
 * @param blend - The blend strategy to use.
 * @param blendRatio - The blend ratio to use.
 * @param startValue - The start value of the signal.
 * @param endValue - The end value of the signal.
 * @param startValueSlope - The start value Secant and or tangent slope of the signal (CUBIC interpolation).
 * @param endValueSlope - The end value Secant and or tangent slope of the signal. (CUBIC interpolation) */
//template<typename PRECISION = double>
function do_Blend(
	  /* BLEND_STRATEGY */ blend
	, /* PRECISION */ blendRatio
	, /* PRECISION */ startValue
	, /* PRECISION */ endValue
	, /* PRECISION */ startValueSlope = 0.0
	, /* PRECISION */ endValueSlope = 0.0)
{
	/* PRECISION */ value = 0;
	
	switch(blend)
	{
		//case BLEND_STRATEGY::CUBIC:
		//value = cubicHermite<PRECISION>(blendRatio, startValue, endValue, 0.0f, 0.0f);
		//break;
		case BLEND_STRATEGY.CUBIC:
		value = cubicHermite/* <PRECISION> */(
					  blendRatio
					, startValue
					, endValue
					, startValueSlope
					, endValueSlope);
		break;
		
		//case BLEND_STRATEGY::QUARTIC:
		//value = quarticEaseInOut(blendRatio, startValue, endValue);
		//break;		
		case BLEND_STRATEGY.QUARTIC:
		value = quarticEaseInOut(blendRatio, startValue, endValue);
		break;
		
		//case BLEND_STRATEGY::LERP:
		case BLEND_STRATEGY.LERP:
		default:
		value = LERP(blendRatio, startValue, endValue);
		break;
	}
	
	return value;
}

function assignWaveShapeFuncs(fmt, wfm){
	for (let _fmt_ of fmt) {
		switch(_fmt_.shape) {
			//case 'Half-Sine':
			//case 'Quarter-Sine':
			//case 'quasiPeriodicNoise':
			case 'Sine': 
				_fmt_.shape_func = wfm.SIN;
				_fmt_.isPhaseSensitive = true;
				break;
			case 'Cosine':
				_fmt_.shape_func = wfm.cos;
				_fmt_.isPhaseSensitive = true;
				break;
			case 'Square':
				_fmt_.shape_func = wfm.square;
				break;
			case 'F. Sawtooth':
				_fmt_.shape_func = function(params){ return wfm.sawtooth(params,'forward'); };
				break;
			case 'R. Sawtooth':
				_fmt_.shape_func = function(params){ return wfm.sawtooth(params,'reverse'); };
				break;
			case 'Triangle': 
				_fmt_.shape_func = wfm.triangle;
				break;
			case 'Pink Noise':
				_fmt_.shape_func = wfm.pinkNoise;
				break;
			case 'Purple Noise':
				_fmt_.shape_func = wfm.purpleVioletNoise;
				break;
			case 'Brown Noise':
				_fmt_.shape_func = wfm.brownNoise;
				break;
			case 'Blue Noise':
				_fmt_.shape_func = wfm.blueNoise;
				break;
			case 'White Gaussian Noise':
				_fmt_.shape_func = wfm.whiteGaussianNoise;
				break;
			default:
				throw (`GenerateComplexSignal > assignWaveShapeFuncs > Error: Unknown wave shape flag encountered - (${_fmt_.shape})! Aborting.`)
				break;
		}
	}
}

/**
@brief Generates complex signal based on specific wave-shape parameters.
@details Generates complex signal based on specific wave-shape parameters.
@param shapes_oscilatorParamsVec: The complex wave-shapes to develop (ie. Formants[]).
@param customUpdateCallback: An (optional) lambda that can be used to update the oscillator parameters, instead.
@return The oscillator signal at frame N).*/
function generateComplexSignal(
	  shapes_oscilatorParamsVec
	, customUpdateCallback = null) {

	let waveform = new FWaveform();
	let channelDataLeft = [];
	var defaultInterpolationMethod = LERP;
	var smoothInterpolationMethod = quarticEaseInOut; // cubicHermite; quarticEaseInOut; sineArcInterpolation; //
	const pcm_encoding = shapes_oscilatorParamsVec.pcm_encoding;

	const hz_pcm_encoding = pcm_encoding_docstring_options[pcm_encoding].sample_rate * 1000; // Khz //

	const const_inv_hz_pcm_encoding = 1/hz_pcm_encoding;
	const bit_depth_pcm_encoding = pcm_encoding_docstring_options[pcm_encoding].bit_depth;

	const dBFS_Saturation_Minimum = bit_depth_pcm_encoding in pcm_bit_depth_encoding_recommended_dBFS_saturation_values 
		? pcm_bit_depth_encoding_recommended_dBFS_saturation_values[bit_depth_pcm_encoding].saturation_value_dBFS
		: pcm_bit_depth_encoding_recommended_dBFS_saturation_values["16"].saturation_value_dBFS;

	const amplitude_pcm_encoding_resolution = Math.pow(2, bit_depth_pcm_encoding - 1) - 1; // preserve the sign bit //

	const amplitude_pcm_encoding_dynamic_range = amplitude_pcm_encoding_resolution / 2;

	assignWaveShapeFuncs(shapes_oscilatorParamsVec, waveform);
		
	for (const shape_oscillatorParams of shapes_oscilatorParamsVec) {

		const I = shape_oscillatorParams.length - 1;

		const TIME = shape_oscillatorParams.last().frame + 1;
	
		// init waveshape params //
		let params = new signalParameters();
		// time characteristics //
		params.TIME = TIME; // END // 
		params.deltaTime = 1; // ie. 1 frame per time increment //
		params.sampleRate = hz_pcm_encoding;
		// amplitude lerp targets //
		params.amplitudeBlendStrategy = shape_oscillatorParams.amplitude_as_bezierCurve_flag
		? BLEND_STRATEGY.QUARTIC
		: BLEND_STRATEGY.LERP;
		// frequency lerp targets //
		params.frequencyBlendStrategy = shape_oscillatorParams.frequency_as_bezierCurve_flag
		? BLEND_STRATEGY.QUARTIC
		: BLEND_STRATEGY.LERP;
		// phase charactersitics //
		params.phase = 0;
		params.cumulativePhase = 0;

		shape_oscillatorParams.map((from,i,me)=>{

			if(i>=I) 
				return from;

			let to = me[i+1];
	
			const start_frame_idx = from.frame;
			const end_frame_idx = to.frame;
			const db_start = from.amplitude > dBFS_Saturation_Minimum ? from.amplitude : -Infinity; // amplitude < dBFS_Saturation_Minimum ? (Audio Silence) //
			const db_end = to.amplitude > dBFS_Saturation_Minimum ? to.amplitude : -Infinity; // amplitude < dBFS_Saturation_Minimum ? (Audio Silence) //
			const hz_start = from.frequency;
			const hz_end = to.frequency;

			// Update next interval waveshape params //

			// time characteristics //
			params.time = from.frame; 
			// amplitude characteristics //
			params.amplitude = db_start;
			params.amplitudeStart = db_start;
			params.amplitudeEnd = db_end;
			// amplitude lerp targets //
			params.amplitudeBlendStartFrame = start_frame_idx;
			params.amplitudeBlendEndFrame = end_frame_idx;
			// frequency characteristics //
			params.frequency = hz_start;
			params.frequencyStart = hz_start;
			params.frequencyEnd = hz_end;
			// frequency lerp targets //
			params.frequencyBlendStartFrame = start_frame_idx;
			params.frequencyBlendEndFrame = end_frame_idx;

			// frame interval targets //
			let t = from.frame;
			const FRAME_IDX = to.frame + 1;

			while(t < FRAME_IDX){

				params.time = t;
				
				const hz_stepRatio = linearStep(t, hz_start, hz_end);
				const db_stepRatio = linearStep(t, db_start, db_end);

				/**
				
				NOTE: (For Sinusoidals)

				Adjusting the phase in your algorithm to maintain smoothness, 
				especially during frequency transitions, requires a careful approach. 
				The goal is to ensure that when the frequency changes, 
				the phase does not introduce discontinuities or abrupt changes in the waveform. 
				Here's an approach to adjust the phase dynamically to accommodate changes 
				in frequency smoothly:
				
				1. Track the cumulative phase of the signal over time.
				
				This phase needs to be updated every time you generate a sample.
				
				2. Adjust Phase During Frequency Transition
		
				When you change the frequency, adjust the starting phase 
				of the new frequency to match the instantaneous phase of the ongoing signal. 
				This helps in avoiding phase discontinuities.
				
				**/

				if (params.isPhaseSensitive) {
					// 1. Track the cumulative phase of the signal over time. //
					const oldFrequency = params.frequency;
					
					params.cumulativePhase += 2 * Math.PI * oldFrequency * params.deltaTime / params.TIME;
				}
				
				params.frequency = const_inv_hz_pcm_encoding * me.frequency_as_bezierCurve_flag 
				? smoothInterpolationMethod(hz_stepRatio, hz_start, hz_end)
				: defaultInterpolationMethod(hz_stepRatio, hz_start, hz_end) ;

				if (params.isPhaseSensitive) {
					// 2. Adjust phase to match the instantaneous phase at the time of frequency change //
					params.phase = params.cumulativePhase - 2 * Math.PI * params.frequency / params.TIME * (params.time + params.deltaTime);
				}
				
				params.amplitude = me.amplitude_as_bezierCurve_flag 
				? smoothInterpolationMethod(hz_stepRatio, db_start, db_end)
				: defaultInterpolationMethod(db_stepRatio, db_start, db_end);

				const outShape = shape_oscillatorParams.shape_func(params);

				if(outShape != null){
					while(channelDataLeft.length < (t + 1))
						channelDataLeft.push(0);

					const dBFS = outShape;

					// Convert dBFS to linear scale //
					// Handle -Infinity case explicitly //
					const linearScale = (dBFS === -Infinity) ? 0 : Math.pow(10, dBFS / 20);

					// Scale up N-bit PCM range to utilize full dynamic range //
					channelDataLeft[t] += linearScale * amplitude_pcm_encoding_dynamic_range; 

					 // Careful not to saturate the audio //
					channelDataLeft[t] = clamp(
						  channelDataLeft[t]
						,-amplitude_pcm_encoding_dynamic_range
						, amplitude_pcm_encoding_dynamic_range);

					++t;
				} else {
					throw (`generateComplexSignal > Error: Formant [${i}], frame [${frame_idx}] - Processing Error.`);
				}

			}

			return from;

		});

	} // End for(shape_oscillatorParams of shapes_oscilatorParamsVec)

	let channelDataRight = [...channelDataLeft];

	// offset LEFT/RIGHT channel alignment by 1 sample //
	channelDataLeft.unshift(0);
	channelDataRight.push(0);

	// encode .WAV headers //
	const channelLength = channelDataLeft.length;
	const sampleRate = hz_pcm_encoding; // Unlimited Rate support (default 192000), though Javascript supports up to PCM 384000 Hz Max decodable @ 32-bit ...most of the time.
	const bitsPerSample = bit_depth_pcm_encoding; // (default 24-bit)

	const duration = channelLength * sampleRate; // (default 1 second) //

	// Left Channel //
	channelDataLeft.sampleRate = sampleRate;
	channelDataLeft.bitsPerSample = bitsPerSample;
	channelDataLeft.duration = duration;

	// Right Channel //
	channelDataRight.sampleRate = sampleRate;
	channelDataRight.bitsPerSample = bitsPerSample;
	channelDataRight.duration = duration;

	return { channelDataLeft, channelDataRight };

} // End generateComplexSignal()

function setInt24(view, offset, value) {
	this.setUint8(offset, (value & 0xFF0000) >> 16);
	this.setUint16(offset + 1, value & 0x00FFFF);
}

function setInt64(view, offset, value) {
	/* 64-bit integers cannot natively be represented in (53-bit) javascript, see BigInt */
	// Check if the environment supports BigInt
	if (typeof BigInt === 'undefined') {
		throw new Error('BigInt is not supported for this environment.');
	}

	// Ensure the value is a BigInt
	const bigValue = BigInt(value);

	// Mask to extract lower 32 bits
	const lowerMask = BigInt(0xFFFFFFFF);

	// Extract lower 32 bits and upper 32 bits
	const lowerPart = bigValue & lowerMask;
	const upperPart = (bigValue >> BigInt(32)) & lowerMask;

	// Write the lower and upper parts into the DataView
	// Assuming little-endian format
	this.setUint32(offset, Number(lowerPart), true);
	this.setUint32(offset + 4, Number(upperPart), true);
}

// Helper functions to write strings as 8-bit integers (bytes)
function writeString(view, offset, string, littleEndianFlag) {
	for (let i = 0; i < string.length; ++i) {
		// Get the UTF-16 code unit for each character
		const codeUnit = string.charCodeAt(i);

		// Write the code unit to the DataView as a 16-bit integer
		view.setUint8(offset + i, codeUnit, littleEndianFlag); // using little-endian format
	}

	// Return the new offset, which is the initial offset plus twice the string's length
	return offset + string.length;
}

// Helper functions to write unsigned integers

function writeUint8(view, offset, value, isLittleEndian) {
	view.setUint8(offset, value, isLittleEndian);
	return offset + 1;
}

function writeUint16(view, offset, value, isLittleEndian) {
	view.setUint16(offset, value, isLittleEndian);
	return offset + 2;
}

function writeUint24(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		// Little-endian: Write LSB first
		view.setInt8(offset, value & 0xFF);
		view.setInt16(offset + 1, (value >> 8) & 0xFFFF, true); // true for little-endian
	} else {
		// Big-endian: Write MSB first
		view.setInt16(offset, (value >> 8) & 0xFFFF, false); // false for big-endian
		view.setInt8(offset + 2, value & 0xFF);
	}
	return offset + 3;
}

function writeUint32(view, offset, value, isLittleEndian) {
	view.setUint32(offset, value, isLittleEndian);
	return offset + 4;
}

function writeUint64(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		view.setUint32(offset, (value >> 32) & 0xFFFFFFFF, true);
		view.setUint32(offset + 4, (value) & 0xFFFFFFFF, true);
	} else {
		view.setUint32(offset, (value) & 0xFFFFFFFF, false);
		view.setUint32(offset + 4, (value >> 32) & 0xFFFFFFFF, false);
	}
	return offset + 8;
}

// Helper functions to write signed integers

function writeInt8(view, offset, value, isLittleEndian) {
	view.setInt8(offset, value);
	return offset + 1;
}

function writeInt16(view, offset, value, isLittleEndian) {
	view.setInt16(offset, value, isLittleEndian);
	return offset + 2;
}

function writeInt24(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		// Little-endian: Write LSB first
		view.setInt8(offset, value & 0xFF);
		view.setInt16(offset + 1, (value >> 8) & 0xFFFF, true); // true for little-endian
	} else {
		// Big-endian: Write MSB first
		view.setInt16(offset, (value >> 8) & 0xFFFF, false); // false for big-endian
		view.setInt8(offset + 2, value & 0xFF);
	}
	return offset + 3;
}

function writeInt32(view, offset, value, isLittleEndian) {
	view.setInt32(offset, value, isLittleEndian);
	return offset + 4;
}

function writeInt64(view, offset, value, isLittleEndian) {
	let high = 0;
	let low = 0;

	if (value >= 0) {
		// Positive value
		high = (value / Math.pow(2, 32)) >>> 0;
		low = value >>> 0;
	} else {
		// Negative value
		// Add 1 to the absolute value to avoid issues with the most negative number
		value += 1;
		low = (Math.abs(value) % Math.pow(2, 32)) >>> 0;
		high = (Math.abs(value) / Math.pow(2, 32)) >>> 0;

		// Adjust for two's complement representation
		low = (~low + 1) >>> 0;
		high = ~high + (low === 0 ? 1 : 0);
	}

	if (isLittleEndian) {
		view.setInt32(offset, low, true);
		view.setInt32(offset + 4, high, true);
	} else {
		view.setInt32(offset, high, false);
		view.setInt32(offset + 4, low, false);
	}

	return offset + 8;
}

// Helper functions to write floating-point numbers

function writeFloat8(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		view.setFloat32(offset, (value & 0xFF), true);
	} else {
		view.setFloat32(offset, (value & 0xFF000000), false);
	}
	return offset + 4;
}

function writeFloat16(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		view.setFloat32(offset, (value & 0xFFFF), true);
	} else {
		view.setFloat32(offset, (value & 0xFFFF0000), false);
	}
	return offset + 4;
}

function writeFloat24(view, offset, value, isLittleEndian) {
	if (isLittleEndian) {
		view.setFloat32(offset, (value & 0xFFFFFF), true);
	} else {
		view.setFloat32(offset, (value & 0xFFFFFF00), false);
	}
	return offset + 4;
}

function writeFloat32(view, offset, value, isLittleEndian) {
	view.setFloat32(offset, value, isLittleEndian);
	return offset + 4;
}

function writeFloat64(view, offset, value, isLittleEndian) {
	view.setFloat64(offset, value, isLittleEndian);
	return offset + 8;
}

/**
@brief Compute the endianness of the operating system.
@details Compute the endianness of the operating system. */
function verifyPlatformIsLittleEndian() {
	let buffer = new ArrayBuffer(2);
	let uint8Array = new Uint8Array(buffer);
	let uint16array = new Uint16Array(buffer);
	uint8Array[0] = 0xAA; // set first byte
	uint8Array[1] = 0xBB; // set second byte
	if (uint16array[0] === 0xBBAA) {
		return true; /* 'little-endian' */;
	}
	else if (uint16array[0] === 0xAABB) {
		return false; /* 'big-endian' */;
	} else throw new Error( "Unknown endianness.");
}

/** 
@brief converts a buffer to WAV audio.
@details Converts a buffer to WAV audio.
@param buffer - The buffer to convert.
@returns The WAV file as a Uint8Array.*/
function bufferToWave(buffer) {
	const numberOfChannels = buffer.length;
	const sampleRate = buffer[0].sampleRate;
	const totalFrames = buffer[0].length;
	const bitsPerSample = buffer[0].bitsPerSample;
	const byteOffset = buffer[0].bitsPerSample / 8; // Calculate byte offset based on bits per sample
	const maxIntN = Math.pow(2, bitsPerSample - 1) - 1; // 2^23 - 1 = 8_388_607; preserve the sign bit
	const littleEndianFlag = verifyPlatformIsLittleEndian(); // true for little-endian, false for big-endian

	const blockAlign = numberOfChannels * byteOffset;

	const dataChunkSize = totalFrames * numberOfChannels * byteOffset;
	const byteRate = sampleRate * blockAlign;
	const pcm_header_offset = 44;

	// Create a buffer to hold the WAV file data
	let wavBuffer = new ArrayBuffer(pcm_header_offset + dataChunkSize);

	// Write WAV container headers; (code to write the 'RIFF', 'WAVE', 'fmt ', 'data' chunk headers, etc.)
	const pcm_wav_header = 44;
	let current_byte_offset = 0;
	let view = new DataView(wavBuffer);

	// Write the PCM chunk data
	let writeChunk = writeInt8;
	switch (buffer[0].bitsPerSample) {
		case 8:
			writeChunk = writeInt8;
			break;
		case 16:
			writeChunk = writeInt16;
			break;
		case 24:
			writeChunk = writeInt24;
			break;
		case 32:
			writeChunk = writeInt32;
			break;
		case 64:
			writeChunk = writeInt64;
			break;
	}

	// Write the 'RIFF' audio content
	let nextChunk = 0;
	for (let i = 0; i < totalFrames; i++) {
		for (let channel = 0; channel < numberOfChannels; channel++) {
			let sample = Math.max(-maxIntN, Math.min(maxIntN, buffer[channel][i])); // clamp
			writeChunk(view, pcm_wav_header + nextChunk, sample, littleEndianFlag);
			nextChunk += byteOffset;
		}
	}

	// Writing the 'RIFF' chunk descriptor
	current_byte_offset = writeString(view, current_byte_offset, 'RIFF', littleEndianFlag); // ChunkID 'RIFF' (big-endian)
	//view.setUint32(4, 36 + dataChunkSize, true); // File size - 8 bytes
	current_byte_offset = writeUint32(view, current_byte_offset, pcm_header_offset - current_byte_offset + dataChunkSize, littleEndianFlag); // File size - 8 bytes
	//writeString(view, 8, 'WAVE');
	current_byte_offset = writeString(view, current_byte_offset, 'WAVE', littleEndianFlag);
	//writeString(view, 12, 'fmt '); // Writing the 'fmt ' sub-chunk
	current_byte_offset = writeString(view, current_byte_offset, 'fmt ', littleEndianFlag);
	//view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
	current_byte_offset = writeUint32(view, current_byte_offset, 16, littleEndianFlag); // Sub-chunk size (16 for PCM)
	//view.setUint16(20, 1, true); // Audio format (1 for PCM)
	current_byte_offset = writeUint16(view, current_byte_offset, 1, littleEndianFlag); // Audio format (1 for PCM)
	//view.setUint16(22, numberOfChannels, true);
	current_byte_offset = writeUint16(view, current_byte_offset, numberOfChannels, littleEndianFlag);
	//view.setUint32(24, sampleRate, true);
	current_byte_offset = writeUint32(view, current_byte_offset, sampleRate, littleEndianFlag);
	//view.setUint32(28, byteRate, true);
	current_byte_offset = writeUint32(view, current_byte_offset, byteRate, littleEndianFlag);
	//view.setUint16(32, blockAlign, true);
	current_byte_offset = writeUint16(view, current_byte_offset, blockAlign, littleEndianFlag);
	//view.setUint16(34, bitsPerSample, true);
	current_byte_offset = writeUint16(view, current_byte_offset, bitsPerSample, littleEndianFlag);

	// Writing the 'data' sub-chunk.. //

	//writeString(view, 36, 'data');
	current_byte_offset = writeString(view, current_byte_offset, 'data', littleEndianFlag);
	//view.setUint32(40, dataChunkSize, true);
	current_byte_offset = writeUint32(view, current_byte_offset, dataChunkSize, littleEndianFlag);

	return wavBuffer; //return new Uint8Array(view.buffer); // 
}

function sinc(x) {
	if (x === 0) return 1;
	const piX = Math.PI * x;
	return Math.sin(piX) / piX;
}

function sinc_interpolation (x, y, t, f) {
	let yt = 0;
	const I = x.length;
	for (let i = 0; i < I; ++i) {
		yt += y[i] * sinc((t - x[i]) * f);
	}
	return yt;
}

AudioBTN.addEventListener('click', function() {
/*
	// Bard: Here's the JavaScript code to generate a sinusoidal audio wveform of 1s duration at PCM 24 bit/48 kHz sampling:

	// Define desired .WAV audio parameters 
	// (largest PCM decode: PCM 768000 Hz @ 32-bit)
	// (largest Javascript PCM encoded file playback: PCM 192000 Hz @ 32-bit)
	const sampleRate = 192000; // Unlimited Rate supported, though Javascript supports up to PCM 384000 Hz Max decodable @ 32-bit
	const bitsPerSample = 32; // 32-bit MAX
	const frequency = 440; // Hz (Tone A4)
	const duration = 1; // 1 second
	const amplitude = 0.4; // 0.5 for a comfortable volume

	// Create an audio buffer with appropriate settings
	let channelDataLeft = new Float64Array (duration * sampleRate);
	let channelDataRight = new Float64Array (duration * sampleRate);

	channelDataLeft.sampleRate = sampleRate;
	channelDataLeft.bitsPerSample = bitsPerSample;

	channelDataRight.sampleRate = sampleRate;
	channelDataRight.bitsPerSample = bitsPerSample;

	// Generate the sine wave data
	const I = channelDataLeft.length;
	const maxInt24 = Math.pow(2, bitsPerSample - 1) - 1; // 2^23 - 1 = 8_388_607; preserve the sign bit

	for (let i = 0; i < I; ++i) {
		const time = i / sampleRate; // returns a value between 0 and 1
		const value = amplitude * Math.sin(2 * Math.PI * frequency * time) ;

		// Ensure the value is positive for linearScale to dBFS conversion
		const absValue = Math.abs(value);

		// Convert to dBFS, and consider the case when absValue is 0
		const dBFS = absValue > 0 ? 20 * Math.log10(absValue) : -Infinity;

		const nsample = value * maxInt24; // Scale for 24-bit audio

		channelDataLeft[i] = nsample;
		channelDataRight[i] = (i > 0) ? channelDataLeft[i-1] : 0;  // offset channel samples by 1 for a perceived stereo signal
	}

	// Example usage //
	let wavBuffer = bufferToWave([channelDataLeft, channelDataRight]);
*/
	const audio_frames = generateComplexSignal(Formants);

	let wavBuffer = bufferToWave([ audio_frames.channelDataLeft, audio_frames.channelDataRight ]);

	let blob = new Blob([wavBuffer], {type: 'audio/wav'});
	let url = URL.createObjectURL(blob);

	// Optionally, create a download link
	let downloadLink = document.createElement('a');
	downloadLink.href = url;
	downloadLink.download = 'audition_audio.wav';
	downloadLink.textContent = '[ Download Synthesized Speech ]';
	document.body.appendChild(downloadLink);

	// Create an audio element and set its source to the blob URL
	let audio = new Audio(url);
	audio.controls = true;
	audio.classList.add('audioPlaybackControls_class');
	audioPlaybackControls.innerHTML = '';
	audioPlaybackControls.appendChild(audio);
});

// Create a new CurveViewer chart instance
var chart_viewer_config = {
	type: 'line',
	data: {
		datasets: [{
			label: 'Left Channel',
			data: [0].map((chart_amplitude/* item */, chart_frame /* idx*/) => ({y:chart_amplitude, x:chart_frame})),
			borderColor: 'blue',
			backgroundColor: 'rgb(0, 0, 255)',
			yAxisID: 'y-axis-amplitude-L',
			xAxisID: 'x-axis-frame',
			showLine: false, // Prevents drawing the line
		}, {
			label: 'Right Channel',
			data: [0].map((chart_amplitude/* item */, chart_frame /* idx*/) => ({y:chart_amplitude, x:chart_frame})),
			borderColor: 'green',
			backgroundColor: 'rgb(0, 140, 0)',
			yAxisID: 'y-axis-amplitude-R',
			xAxisID: 'x-axis-frame-dupl',
			showLine: false, // Prevents drawing the line
		}]
	},
	options: {
		scales: {
			'y-axis-amplitude-L': {
				type: 'linear',
				title: { 
					text: 'dBFS ( Decibels relative to Full Scale )',
					display: true,
				},
				display: true,
				position: 'left',
				grid: {
					drawOnChartArea: true
				},
				ticks: {
					// Include a UNITS placeholder in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]) + ' dBFS';
					}
				}
			},
			'y-axis-amplitude-R': {
				type: 'linear',
				title: { 
					text: 'dBFS ( Decibels relative to Full Scale )',
					display: true,
				},
				display: true,
				position: 'right',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a UNITS placeholder in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]) + ' dBFS';
					}
				}
			},
			'x-axis-frame': {
				type: 'linear',
				title: { 
					text: 'Audio Sample ( Frame ) ',
					display: true,
				},
				display: true,
				position: 'bottom',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]);
					}
				}
			},
			'x-axis-frame-dupl': {
				type: 'linear',
				title: { 
					text: 'Audio Sample ( Frame ) ',
					display: true,
				},
				display: true,
				position: 'top',
				grid: {
					drawOnChartArea: false
				},
				ticks: {
					// Include a dollar sign in the ticks
					callback: function(value, index, ticks) {
						// call the default formatter, forwarding `this`
						return Chart.Ticks.formatters.numeric.apply(this, [value, index, ticks]);
					}
				}
			}
		},
		responsive: true, // Makes the chart responsive to window resizing
		animation: false, // Disable chart animations ( performance)
		maintainAspectRatio: true, // Maintain aspect ratio
		plugins: {
			legend: {
				labels: {
					fontSize: 14 // Legend font size
				}
			},
			tooltip: {
				// Enable custom tooltips
				enabled: true,
				mode: 'index',
				position: 'nearest',
				bodyFontSize: 12, // Tooltip font size
				callbacks: {
					title: function(tooltips, data) {
						// Assuming the first dataset is for amplitude and has complete frame and time_step data
						const tt = tooltips[0];
						//const tt2 = tooltips[1];
						//const tmpTimeStep = tt.label;
						const tmpFrame = tt.label;
						//const tmpFrame = tt2.label;
						/*
						const tmpAmplitude = tt.formattedValue;
						const tmpfrequency = tt2.formattedValue;
						*/
						return `Frame: ${tmpFrame}`;
					},
					label: function(tooltipItem, data) {
						// tooltipItem is an object containing properties of the tooltip
						// data is an object containing all data passed to the chart
						let yLabel = tooltipItem.formattedValue;
						const xLabel = tooltipItem.dataset.label;
						if (xLabel.match(/^Left/)) {
							yLabel = `Amplitude: ${yLabel} dBFS`;
						} else if (xLabel.match(/^Right/)) {
							yLabel = `Amplitude: ${yLabel} dBFS`;
						}
						return yLabel;
					}
				}
			},
		},
	}
};

//waveform_viewer_canvas.style.width = "600px";
//waveform_viewer_canvas.style.height  = "200px";

Cpp20BTN.addEventListener('click', function() {

	// Bard: Here's the JavaScript code to generate a sinusoidal audio wveform of 1s duration at PCM 24 bit/48 kHz sampling:

	// Define desired .WAV audio parameters 
	// (largest PCM decode: PCM 768000 Hz @ 32-bit)
	// (largest Javascript PCM encoded file playback: PCM 192000 Hz @ 32-bit)
	const sampleRate = 192000; // Unlimited Rate supported, though Javascript supports up to PCM 384000 Hz Max decodable @ 32-bit
	const bitsPerSample = 32; // 32-bit MAX
	const frequency = 440; // Hz (Tone A4)
	const duration = 1; // 1 second
	const amplitude = 0.4; // 0.5 for a comfortable volume

	const I = Math.min(25000, duration * sampleRate);

	// Create an audio buffer with appropriate settings
	let channelDataLeft =  new Float64Array (I);
	let channelDataRight = new Float64Array (I);

	channelDataLeft.sampleRate = sampleRate;
	channelDataLeft.bitsPerSample = bitsPerSample;

	channelDataRight.sampleRate = sampleRate;
	channelDataRight.bitsPerSample = bitsPerSample;

	// Generate the sine wave data
	//const maxInt24 = Math.pow(2, bitsPerSample - 1) - 1; // 2^23 - 1 = 8_388_607; preserve the sign bit
	for (let i = 0; i < I; ++i) {
		const time = i / sampleRate; // returns a value between 0 and 1
		const value = Math.sin(2 * Math.PI * frequency * time) * amplitude;

		// Ensure the value is positive for dBFS conversion
		const absValue = Math.abs(value);

		// Convert to dBFS and consider the case when absValue is 0
		//const dBFS = absValue > 0 ? 20 * Math.log10(absValue) : -Infinity;

		const nsample = value; //value * maxInt24; // Scale for eg. 24-bit audio

		channelDataLeft[i] = nsample;
		channelDataRight[i] = (i > 0) ? channelDataLeft[i-1] : 0;  // offset channel samples by 1 for a perceived stereo signal
	}

	showOverlayWithData( [
		  Array.from(channelDataLeft, (chart_amplitude/* item */, chart_frame /* idx*/) => ({ y:chart_amplitude, x:chart_frame }))
		, Array.from(channelDataRight, (chart_amplitude/* item */, chart_frame /* idx*/) => ({ y:chart_amplitude, x:chart_frame }))] );

});

function showOverlayWithData(data) {
	var ctx = document.getElementById('waveform_viewer_canvas').getContext('2d');

	// Check if the chart instance already exists
	if (!window.overlayChart) {	
		waveform_viewer_canvas.style.marginBottom = "12px";
		waveform_viewer_canvas.style.borderRight = "24px";
		waveform_viewer_canvas.style.borderRightStyle = "solid";
		waveform_viewer_canvas.style.borderColor = "black";
		// Initialize the chart if it doesn't exist
		window.overlayChart = new Chart(ctx, chart_viewer_config);
	}

	const leftChannelData = 0;
	const rightChannelData = 1;

	window.overlayChart.data.datasets[leftChannelData].data = data[leftChannelData]; // Update L-Channel data
	window.overlayChart.data.datasets[rightChannelData].data = data[rightChannelData]; // Update R-Channel data

	//waveform_viewer_canvas.style.width = '1200px'; // Show the overlay
	//waveform_viewer_canvas.style.height = '1000px'; // Show the overlay

	window.overlayChart.update(); // Update the chart

	popupContainer.style.display = 'block'; // Show the overlay
	json_form_class.style.display = 'block'; // Hide the overlay
	waveform_container.style.display = 'block'; // Show the overlay

	JsonTA.style.display = 'none';
	jsonFORM.style.display = 'none';
	slider_container.style.display = 'none';
}

function closeOverlay() {
	popupContainer.style.display = 'none'; // Show the overlay
	json_form_class.style.display = 'none'; // Hide the overlay
	waveform_container.style.display = 'none'; // Show the overlay
}

/**
Example Usage for linearStep ratio
smoothly interpolated value between 0 and 1. 

	value = linearStep(x, start, end);
*/

/**
 * @brief Calculates a smooth transition between 0 and 1 using a linear interpolation. 
 * @details Calculates a smooth transition between 0 and 1 using a linear interpolation. 
 * This function can be used to apply linear effects to your values. 
 * @param {number} x - The input value for which to calculate the smoothstep, typically time or a normalized parameter.
 * @param {number} start - The lower bound of the input range.
 * @param {number} end - The upper bound of the input range.
 * @returns {number} - The smoothly interpolated stepRatio between 0 and 1. */
function linearStep(x, min, max) {
	if (x <= min) return 0;
	if (x >= max) return 1;
	const stepRatio = (x - min) / (max - min);
	return stepRatio;
}

/**
 * @details Performs quartic ease-in interpolation.
 * Starts with a slow acceleration and then speeds up.
 * @param {number} t - The interpolation factor, between 0.0 (start) and 1.0 (end).
 * @returns {number} The interpolated value at the factor t, assuming start value is 0 and end value is 1. */
function quarticEaseIn(t) {
	return t * t * t * t;
}

/**
 * Performs quartic ease-out interpolation.
 * Starts fast and decelerates to a stop.
 * @param {number} t - The interpolation factor, between 0.0 (start) and 1.0 (end).
 * @returns {number} The interpolated value at the factor t, assuming start value is 0 and end value is 1. */
function quarticEaseOut(t) {
	return 1 - (--t) * t * t * t;
}

/*
	// Example usage for quarticEaseInOut
	const double ii = 0; // Starting value //
	const double II = 100;   // Ending value //

	std::cout << "[ ";

	for(double i = ii; i < II; i += 0.01)
	{
		const double stepRatio = linearStep(i,ii,II); // Current time as a normalized between [0, 1] //
		
		const double interpolatedValue = quarticEaseInOut(stepRatio, ii, II);
		
		std::cout << interpolatedValue << ", ";
	}

	std::cout << " ]";
*/

/**
 * @brief Performa a Linear Interpolation between two values.
 * @details Performa a Linear Interpolation between two values.
 * @param {*} t  - The interpolation factor, ranging from 0.0 (start) to 1.0 (end).
 * @param {*} start  - The starting value of the parameter to interpolate.
 * @param {*} end  - The ending value of the parameter to interpolate.
 * @returns  The interpolated value. */
function LERP(
	t
  , start
  , end)
{
  const result = (1-t) * start + end * t;

  return result;
}

/**
 * @brief Accelerates from start and decelerates to stop.
 * @details Combines quartic ease-in and ease-out into a single function.
 * @param {number} t - The interpolation factor, between 0.0 (start) and 1.0 (end).
 * @param {number} start - The starting value of the parameter to interpolate.
 * @param {number} end - The ending value of the parameter to interpolate.
 * @returns {number} The interpolated value. */
function quarticEaseInOut(t, startValue, endValue) {
	t = Math.max(0, Math.min(1, t)); // Clamp t to the range [0, 1] //
	if (t < 0.5) {
		return startValue + (endValue - startValue) * 8 * t * t * t * t;
	} else {
		t = t - 1;
		return startValue + (endValue - startValue) * (1 - 8 * t * t * t * t);
	}
}

/**
	Example usage for cubicHermite
 
	// Example usage //
	const double ii = 0; // Starting value //
	const double II = 100;   // Ending value //

	std::cout << "[ ";

	for(double i = ii; i < II; i += 0.01)
	{
		const double stepRatio = linearStep(i,ii,II); // Current time as a normalized between [0, 1] //
		
		const double interpolatedValue = cubicHermite(stepRatio, ii, II, 0.0, 0.0);
		
		std::cout << interpolatedValue << ", ";
	}

	std::cout << " ]";
 */

	/**
 * Performs cubic Hermite interpolation between two values bound within an interval.
 * 
 * @param {number} t - The interpolation factor, ranging from 0.0 (start) to 1.0 (end).
 * @param {number} start - The starting value of the interpolation (at t=0).
 * @param {number} end - The ending value of the interpolation (at t=1).
 * @param {number} m0 - The tangent secant (slope) at the starting point.
 * @param {number} m1 - The tangent secant (slope) at the ending point.
 * @returns {number} - The interpolated value. */
function cubicHermite(t, p0, p1, m0, m1) {
	const t2 = t * t;
	const t3 = t2 * t;
	return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

/**
 * @brief  Interpolates between startValue and endValue using a sine arc.
 * @param  t - The interpolation parameter, ranging from 0 (start) to 1 (end).
 * @param  startValue - The starting value of the parameter to interpolate.
 * @param  endValue - The ending value of the parameter to interpolate. */
function sineArcInterpolation(
	  t
	, startValue
	, endValue) {
	// Ensure t is within the bounds [0, 1]
	if (t < 0.0) t = 0.0;
	if (t > 1.0) t = 1.0;

	// Calculate the angle for the sine function, ranging from -PI/2 to PI/2
	// This maps the linear progression of t to a sine curve
	let theta = Math.PI * (t - 0.5);
	
	// Calculate the sine value, which will smoothly transition from -1 to 1
	let sineValue = Math.sin(theta);
	
	// Adjust the sine curve to go from 0 to 1 instead of -1 to 1
	let normalizedSine = (sineValue + 1.0) / 2.0;
	
	// Interpolate between startValue and endValue based on the normalized sine curve
	return startValue + (endValue - startValue) * normalizedSine;
}

okBTN.addEventListener('click', function(e) {
	e.preventDefault();
	try {
		hideTAElement();
		switch(jsonFORM.jsonIndirection) {
			case 'in':
				const tmpData = JSON.parse(JsonTA.value);
				//todo: rebuild the chart objects with the new data
				break;
			case 'out':
			case 'none':
			default: break;
		}
	} catch (e) {
		console.info(e);
	}
});

cancelBTN.addEventListener('click', function(e) {
	e.preventDefault();
	try {
		hideTAElement();
		switch(jsonFORM.jsonIndirection) {
			case 'in':
			case 'out':
			case 'none':
			default:
				break;
		}
	} catch (err) {
		console.info(err);
	}
});

function updateProgress(progress) {
	progressBar.style.width = progress.toString() + '%';

	if (progress == 100) {
		setTimeout(function() {
			progressBar.style.display = 'none';
		}, 500); // 500 milliseconds = 0.5 seconds
	} else if (
		progress > 0 
		&& progressBar.style.display != 'block') {
			progressBar.style.display = 'block';
	}
}

amplitudeBtn.addEventListener('click', function() {
	this.classList.add('selected');
	frequencyBtn.classList.remove('selected');
	g_formantChart.yAxisAmplitudeVisibleFlag = true;
});

frequencyBtn.addEventListener('click', function() {
	this.classList.add('selected');
	amplitudeBtn.classList.remove('selected');
	g_formantChart.yAxisAmplitudeVisibleFlag = false;
});

window.addEventListener('keydown', function(e) {
	// Close popup on escape key press //
	if (e.key === 'Escape')
	{
		closeOverlay();
	} 
	else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')
	{
		e.preventDefault(); // Prevent the default undo behavior
		// Ctrl + Shift + Z for redo in some applications and Firefox
		if (e.shiftKey) {
			redo(); // console.log('Ctrl + Shift + Z pressed');
		} else {
			undo();  //console.log('Ctrl + Z pressed');
		}
	}
	// Check if Ctrl (or Cmd on Mac!) is pressed along with Y
	// Note: Firefox might not use 'y' for redo, relying on Ctrl + Shift + Z instead.
	else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
	{
		e.preventDefault(); // Prevent the default redo behavior
		redo(); //console.log('Ctrl + Y pressed');
	}
});

window.addEventListener('resize', () => {
	// Update the chart //
	g_formantChart.resize();
});


} catch (e) {
	console.info(`Unexpected error: ${e}`);
}

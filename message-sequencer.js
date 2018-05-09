/**
 * Copyright 2016 tedstriker.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var _debugmode = false;

    function PlayerNode(n) {
        RED.nodes.createNode(this, n);
        var _node = this;
        var _runOnLoad = n.runOnLoad;
        var _store = {};

        // respond to inputs....
        this.on('input', function(msg) {
            // var _name = msg.name ||  msg.topic;

            if (msg.sequence) {
                var _player = new SequencePlayer(_node);
                _player.loadSequence(msg.sequence);
                _store[_player.name()] = _player;

                if (_debugmode) {
                    _node.warn("sequence loaded");
                }

                // play immediately, when a new sequence has been loaded
                if (_runOnLoad) {
                    _store[_player.name()].play();
                }
            }

            if (msg.hasOwnProperty('play')) {
                // var key = "";
                if (_debugmode) {
                    _node.warn("play received");
                }
                triggerCommand('play', msg.play);
            }

            if (msg.hasOwnProperty('stop')) {
                if (_debugmode) {
                    _node.warn("stop received");
                }
                triggerCommand('stop', msg.stop);
            }

            if (msg.hasOwnProperty('enumerate')) {
                if (_debugmode) {
                    _node.warn("enumerate received");
                    _node.warn(Object.keys(_store));
                }
                _node.send({
                    loadedSequences: Object.keys(_store)
                });
            }

            if (msg.hasOwnProperty('remove')) {
                if (_debugmode) {
                    _node.warn("remove received");
                }
                if (msg.remove === "" || msg.remove === []) {
                    _store = [];
                } else if (msg.remove.constructor === "".constructor && msg.remove !== "") {
                    if (_store.hasOwnProperty(msg.remove)) {
                        delete _store[msg.remove];
                    } else {
                        _node.error("No sequence with name '" + _name + "' loaded.");
                    }
                } else if (msg.remove.constructor === [].constructor && msg.remove !== []) {
                    for (let key of msg.remove) {
                        if (_store.hasOwnProperty(key)) {
                            delete _store[key];
                        } else {
                            _node.error("No sequence with name '" + _name + "' loaded.");
                        }
                    }
                }

            }

            function triggerCommand(cmd, names) {

                if (names === "" || names === []) {
                    var seqNameArray = Object.keys(_store);
                    for (let key of seqNameArray) {
                        _store[key][cmd]();
                    }
                } else if (names.constructor === "".constructor && names !== "") {
                    if (_store.hasOwnProperty(names)) {
                        _store[names][cmd]();
                    }
                } else if (names.constructor === [].constructor && names !== []) {
                    for (let key of names) {
                        if (_store.hasOwnProperty(key)) {
                            _store[key][cmd]();
                        } else {
                            _node.error("No sequence with name '" + _name + "' loaded.");
                        }
                    }
                }
            }
        });

        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
        });

    }
    RED.nodes.registerType("sequencer-player", PlayerNode);

    function RecoderNode(n) {
        RED.nodes.createNode(this, n);
        var _node = this;
        var _recorder = new SequenceRecorder(_node);
        _node.maxElements = n.maxElements;
        _node.maxDuration = n.maxDuration;
        _node.startImmediately = n.startImmediately;


        // respond to inputs....
        this.on('input', function(msg) {

            if (msg.hasOwnProperty('stop')) {
                if (_debugmode) {
                    _node.warn("stop received");
                }
                _recorder.stop();

            } else if (msg.hasOwnProperty('start')) {
                if (_debugmode) {
                    _node.warn("record received");
                }
                _recorder.start(msg);
            } else {
                _recorder.recordElement(msg);
            }
        });

        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: node.client.disconnect();
        });

    }
    RED.nodes.registerType("sequencer-recorder", RecoderNode);

    function SequencePlayer(n) {
        var _isPlaying = false;
        var _lastTimer;
        var _startedAt;
        var _currentElement;
        var _seq;
        var _node = n;
        var _nodeInstance = this;

        this.loadSequence = function(sequence) {
            var _seqData;
            try {

                if (sequence.constructor === {}.constructor) {
                    _seqData = sequence;
                } else if (sequence.constructor === "".constructor) {
                    _seqData = JSON.parse(sequence);
                } else {
                    throw "Input is not a sequence";
                }

                _seq = new Sequence();
                _seq.loadSequence(_seqData);

            } catch (e) {
                throw "Loaded object is not a sequence.";
            }
        };

        this.play = function() {
            if (hasSequence() && !_isPlaying) {
                _isPlaying = true;
                _node.status({
                    fill: "green",
                    shape: "dot",
                    text: "playing"
                });

                    run();
            } else if (_isPlaying) {
                throw "already playing " + _seq.name();
            } else {
                _isPlaying = false;
                throw "no sequence loaded.";
            }

        };

        function run() {
            if (_isPlaying && _seq.hasNext()) {

                var _startedAt = Date.now();
                var _currentElement = null;

                var timerId = setInterval(function () {
                    if (_isPlaying) {
                        if (typeof _currentElement === 'undefined' || _currentElement === null) {
                            _currentElement = _seq.next();
                        }

                        if (_currentElement.delay <= (Date.now() - _startedAt)) {
//                            _node.send({ topic: "delay", payload: _currentElement.delay });
//                            _node.send({ topic: "time", payload: Date.now() - _startedAt });
                    _node.send(_currentElement.data);
                            _currentElement = _seq.next();
                }
            }
                    if (_currentElement === null) {
                        clearInterval(timerId);
                        _nodeInstance.stop();
                    }

                }, 2);

            } else if (!_seq.hasNext()) {
                _nodeInstance.stop();
            }
        }

        /*
        function run() {
            if (_isPlaying && _seq.hasNext()) {
                _currentElement = _seq.next();

                var timer = setTimeout(function() {
                    _startedAt = Date.now();
                    _node.send(_currentElement.data);
                    run();
                }, _currentElement.delay);
                _lastTimer = timer;


            } else if (!_seq.hasNext()) {
                _nodeInstance.stop();
            }
        }
*/
        this.stop = function() {
            clearTimeout(_lastTimer);
            _isPlaying = false;
            _lastTimer = undefined;
            _currentElement = undefined;
            _startedAt = undefined;
            _node.status({});
            if (hasSequence()) {
                _seq.reset();
            }
        };

        function hasSequence() {
            return _seq instanceof Sequence;
        }

        this.name = function() {
            if (hasSequence()) {
                return _seq.name();
            }
        };
    }

    function SequenceRecorder(n) {
        var _node = this;
        var _seq;
        var _name;
        var _maxElements;
        var _maxDuration;
        var _startImmediately;
        var _maxDurationTimer;

        var _obsolteProperties = ["_msgid"];
        var _recordStartTime;
        var _isRecording = false;
        var _waitingForFirstMessage = false;

        // Initialize record settings
        this.start = function(msg) {
            if (!_isRecording) {
                _isRecording = true;
                _recordStartTime = Date.now();
                _waitingForFirstMessage = true;
                _name = msg.start || msg.name || msg.topic;
                _maxElements = msg.maxElements || n.maxElements;
                _maxDuration = msg.maxDuration || n.maxDuration;
                _startImmediately = msg.startImmediately || n.startImmediately;

                _seq = new Sequence(_name);

                n.status({
                    fill: "red",
                    shape: "ring",
                    text: "recording"
                });

                // Timer starts immediately after 'startRecord' command
                if (_startImmediately) {
                    _waitingForFirstMessage = false;
                    n.status({
                        fill: "red",
                        shape: "dot",
                        text: "recording"
                    });
                    startRecordingTimeout();
                }

                if (_debugmode) {
                    _node.warn("recording started");
                }
            }
        };

        // append message to record set
        this.recordElement = function(msg) {
            if (_waitingForFirstMessage) {
                n.status({
                    fill: "red",
                    shape: "dot",
                    text: "recording"
                });

                startRecordingTimeout();
                _waitingForFirstMessage = false;
            }

            if (_isRecording) {
                var obj = removeObsoleteProperties(msg);
                var delay = Date.now() - _recordStartTime;

                _seq.addElement(obj, delay);

                if (_maxElements && _maxElements <= _seq.count()) {
                    if (_debugmode) {
                        node.warn("maximum number of recorded elements reached");
                    }
                    this.stop();
                }
            }
        };

        this.stop = function() {
            if (_isRecording) {
                _isRecording = false;
                _recordStartTime = undefined;
                n.status({});
            }

            if (_maxDurationTimer) {
                clearTimeout(_maxDurationTimer);
            }

            if (this.hasSequence()) {
                var newMsg = {};
                newMsg.sequence = this.getSequence();
                n.send(newMsg);
            }
        };

        this.getSequence = function() {
            if (_seq) {
                return _seq.get();
            }
        };

        this.hasSequence = function() {
            if (_seq && _seq.get()) {
                return true;
            } else {
                return false;
            }
        };

        /* removes the following properties:
         * .name
         * .command
         * ._msgid
         */

        function removeObsoleteProperties(msg) {
            var newMsg = msg;
            for (var i in _obsolteProperties) {
                delete newMsg[_obsolteProperties[i]];
            }

            return newMsg;
        }

        function startRecordingTimeout() {
            if (_maxDuration && _maxDuration !== 0) {
                _maxDurationTimer = setTimeout(function() {
                    if (_debugmode) {
                        node.warn("maximum recording time reached");
                    }
                    _node.stop();
                }, _maxDuration * 1000);
            }
        }
    }

    // structure of the recordings
    function Sequence(name) {
        var _queue = [];
        var _pointer = 0;
        var _seqName = name || "SEQ" + (1 + Math.random() * 4294967295).toString(16);

        this.addElement = function(data, delay) {
            _queue.push(new Element(data, delay));
        };
        this.addElements = function(seqArray) {
            //tbd verify seqArray is an array containing valid Element objects
            _queue = _queue.concat(seqArray);
        };

        this.loadSequence = function(seqObject) {
            //tbd verify seqArray is an array containing valid Element objects
            try {
                if (seqObject.name) {
                    _seqName = seqObject.name;
                }
                if (seqObject.seq) {
                    _queue = seqObject.seq;
                }

            } catch (e) {
                if (e) {
                    throw e;
                } else {
                    throw "Sequence loading failed. Object not a valid sequence.";
                }
            }
        };

        this.next = function() {
            var currentElement = _queue[_pointer];
            if (currentElement) {
                _pointer++;
                return currentElement;
            } else {
                return null;
            }
        };

        this.hasNext = function() {
            return _pointer < _queue.length;
        };

        // reset sequence after run
        this.reset = function() {
            _pointer = 0;
        };

        this.clear = function() {
            _queue = [];
        };

        this.name = function(newName) {
            if (newName) {
                _seqName = newName;
            }
            return _seqName;
        };

        this.count = function () {
            return _queue.length;
        };

        this.toJSON = function() {
            return JSON.stringify(objectify());
        };

        this.get = function() {
            return objectify();
        };

        function objectify() {
            return {
                name: _seqName,
                seq: _queue
            };
        }
    }
    // a single element contained in a sequence
    function Element(obj, valDelay) {

        var retDelay;

        // normalize delay
        if (isNaN(valDelay)) {
            retDelay = 0;
        } else {
            retDelay = parseInt(valDelay);
        }

        if (retDelay < 0) {
            retDelay = 0;
        }

        this.data = obj;
        this.delay = retDelay;
    }
};
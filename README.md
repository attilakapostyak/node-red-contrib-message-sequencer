node-red-contrib-message-sequencer
==========================
## Description
"Message Sequencer" nodes allows you to record and replay message sequences within Node-RED.
For each message a delay is specified, which is the time relative to the start of the sequence.

This module is based on node-red-contrib-sequencer but with a completely different approach on how delays are handled. (https://github.com/tedstriker/node-red-contrib-sequencer)

## Install via NPM

From inside your node-red directory:
```
npm install node-red-contrib-message-sequencer
```

## How to?
The module comes with the following nodes:

1. ```Sequence Recorder``` : with this node you can record sequences of messages, returns a sequence object which then can be replayed by the player node.

2. ```Sequence Player``` : this node takes a sequence object and send messages at the intervals specified in the sequence. With this node you can easily replay and send messages previously recorded with the Sequence Recorder node.

The player can replay multiple sequences in parallel.


The sequence recorder returns a sequence object in the following format:
```
{
  "name": "Example",
  "sequence": [
    {
      "data": {
        "topic": "Topic_1",
        "payload": "A"
      },
      "delay": 0
    },
    {
      "data": {
        "topic": "Topic_2",
        "payload": "B"
      },
      "delay": 1000
    },
    {
      "data": {
        "topic": "Topic_1",
        "payload": "C"
      },
      "delay": 2000
    }
  ]
}

```
- ```name``` the name of the sequence. Use this name to specify the sequence to play or stop in ```Sequence Player```.
- ```sequence``` the array of objects and the delay.
 - ```data``` this object will be output as a new message when being replayed.
 - ```delay``` the time in milliseconds since the sequence started.

## Usage

### Recorder

For Recorder node, the following commands are available:

- ```msg.start``` records a new sequence
- ```msg.stop``` stops current recording and return already recorded sequence

When recording is stopped, the recorded sequence will be returned as a single message. The payload contains the sequence object.

### Player

A player node is able to run multiple sequences in parallel. These are identified by the sequence name.
Following commands are available:

- ```msg.name``` The name of the sequence to be played or stopped. 
- ```msg.sequence``` load sequences into player (format: JSON or sequence object)
- ```msg.play``` plays a sequence. Property value = sequence name
- ```msg.stop``` stops the currently played sequence 
- ```msg.remove``` removes a sequence from the player
- ```msg.enumerate``` returns an array with all names of currently loaded sequences

play, stop and remove properties take either a string or an array containing the name(s). If the value is an empty string it is assumed, that all loaded sequences shall be played, stopped or removed.

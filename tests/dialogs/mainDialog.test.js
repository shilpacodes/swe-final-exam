/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-env node, mocha */
const { TextPrompt } = require('botbuilder-dialogs');
const { DialogTestClient, DialogTestLogger } = require('botbuilder-testing');
const { DepartmentRecognizer } = require('../../dialogs/departmentRecognizer');
const { MainDialog } = require('../../dialogs/mainDialog');
const { DepartmentDialog } = require('../../dialogs/departmentDialog');
const assert = require('assert');
const moment = require('moment-timezone');

/**
 * A mock DepartmentRecognizer for our main dialog tests that takes
 * a mock luis result and can set as isConfigured === false.
 */
class MockDepartmentRecognizer extends DepartmentRecognizer {
    constructor(isConfigured, mockResult) {
        super(isConfigured);
        this.isLuisConfigured = isConfigured;
        this.mockResult = mockResult;
    }

    async executeLuisQuery(context) {
        return this.mockResult;
    }

    get isConfigured() {
        return (this.isLuisConfigured);
    }
}

/**
 * A simple mock for Department dialog that just returns a preset booking info for tests.
 */
class MockDepartmentDialog extends DepartmentDialog {
    constructor() {
        super('departmentDialog');
    }

    async beginDialog(dc, options) {
        const departmentDetails = {
            departmentName: 'Computer Science',
            facultyName: 'Dr. Deidra J. Morrison'
        };
        await dc.context.sendActivity(`${ this.id } mock invoked`);
        return await dc.endDialog(departmentDetails);
    }
}

/**
* A specialized mock for DepartmentDialog that displays a dummy TextPrompt.
* The dummy prompt is used to prevent the MainDialog waterfall from moving to the next step
* and assert that the main dialog was called.
*/
class MockDepartmentDialogWithPrompt extends DepartmentDialog {
    constructor() {
        super('departmentDialog');
    }

    async beginDialog(dc, options) {
        dc.dialogs.add(new TextPrompt('MockDialog'));
        return await dc.prompt('MockDialog', { prompt: `${ this.id } mock invoked` });
    }
};

describe('MainDialog', () => {
    it('Shows message if LUIS is not configured and calls DepartmentDialogDirectly', async () => {
        const mockRecognizer = new MockDepartmentRecognizer(false);
        const mockDepartmentDialog = new MockDepartmentDialogWithPrompt();
        const sut = new MainDialog(mockRecognizer, mockDepartmentDialog);
        const client = new DialogTestClient('test', sut, null, [new DialogTestLogger()]);

        const reply = await client.sendActivity('hi');
        assert.strictEqual(reply.text, 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.', 'Did not warn about missing luis');
    });

    it('Shows prompt if LUIS is configured', async () => {
        const mockRecognizer = new MockDepartmentRecognizer(true);
        const mockDepartmentDialog = new MockDepartmentDialog();
        const sut = new MainDialog(mockRecognizer, mockDepartmentDialog);
        const client = new DialogTestClient('test', sut, null, [new DialogTestLogger()]);

        const reply = await client.sendActivity('hi');
        assert.strictEqual(reply.text, `Try asking: "Can you connect me with someone from the Computer Science department?"`);
    });

    describe('Invokes tasks based on LUIS intent', () => {
        // Create array with test case data.
        const testCases = [
            { utterance: 'Can you connect me with Dr. Sriram from the Computer Science department?', intent: 'SelectDepartmentMember', invokedDialogResponse: 'departmentDialog mock invoked', taskConfirmationMessage: 'Please confirm you want to speak with Dr. Sriram from the Computer Science department.' },
        ];

        testCases.map(testData => {
            it(testData.intent, async () => {
                // Create LuisResult for the mock recognizer.
                const mockLuisResult = JSON.parse(`{"intents": {"${ testData.intent }": {"score": 1}}, "entities": {"$instance": {}}}`);
                const mockRecognizer = new MockDepartmentRecognizer(true, mockLuisResult);
                const departmentDialog = new MockDepartmentDialog();
                const sut = new MainDialog(mockRecognizer, departmentDialog);
                const client = new DialogTestClient('test', sut, null, [new DialogTestLogger()]);

                // Execute the test case
                console.log(`Test Case: ${ testData.intent }`);
                let reply = await client.sendActivity('Can you connect me with Dr. Sriram from the Computer Science department?');
                assert.strictEqual(reply.text, 'Try asking: "Can you connect me with someone from the Computer Science department?"');

                reply = await client.sendActivity(testData.utterance);
                assert.strictEqual(reply.text, testData.invokedDialogResponse);

                // The Department dialog displays an additional confirmation message, assert that it is what we expect.
                if (testData.taskConfirmationMessage) {
                    reply = client.getNextReply();
                    assert(reply.text.startsWith(testData.taskConfirmationMessage));
                }
            });
        });
    });
});

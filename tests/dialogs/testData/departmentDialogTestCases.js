/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
module.exports = [
    {
        name: 'Full flow',
        initialData: {},
        steps: [
            ['Can you connect me with Dr. Sriram from the Computer Science department?', 'Please confirm you want to speak with Dr. Sriram from the Computer Science department.'],
            ['yes', 'Okay. I am connecting you to Dr. Sriram…'],
        ],
        expectedStatus: 'complete',
        expectedResult: {
            facultyName: 'Dr. Sriram',
            departmentName: 'Computer Science',
        }
    }
];

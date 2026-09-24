// tests/e2e/access/access-authenticated-permissions.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED PERMISSION HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Certifies the public Permission Catalog boundary:
//   • authenticated Access administrators may read the catalog
//   • public HTTP callers may not mutate the canonical Permission Catalog
//   • Permission creation remains Security Foundation™ only
// -----------------------------------------------------------------------------

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    ACCESS_ADMINISTRATIVE_PERMISSIONS,
} from "../../../services/access/src/authorization";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "./support/access-authenticated-fixtures";

describe(
    "Access™ authenticated permission HTTP behavior",
    () => {
        it(
            "reads the Permission Catalog with authenticated administrative authority",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        "/permissions",
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    items:
                        expect.any(
                            Array,
                        ),

                    count:
                        expect.any(
                            Number,
                        ),
                });

                expect(
                    response.json().items,
                ).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            permissionId:
                                ACCESS_ADMINISTRATIVE_PERMISSIONS
                                    .permissionList
                                    .permissionId,
                        }),
                    ]),
                );
            },
        );

        it(
            "keeps Permission Catalog mutation restricted to the Security Foundation boundary",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/permissions",
                        {
                            key:
                                "certification.permission.create",

                            name:
                                "Certification Permission",

                            description:
                                "Public HTTP must not create canonical permissions.",

                            scope:
                                "tenant",
                        },
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    403,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    error: {
                        code:
                            expect.any(
                                String,
                            ),
                    },
                });
            },
        );
    },
);

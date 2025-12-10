import {TypeInfo} from './types';
    
    export const sampleTypeData: TypeInfo = {
  "kind": "function",
  "name": "ActionCreatorWithPayload<FetchBookingDurationsSuccessActionPayload, string>",
  "baseName": "ActionCreatorWithPayload",
  "generics": [
    {
      "kind": "interface",
      "name": "FetchBookingDurationsSuccessActionPayload",
      "baseName": "FetchBookingDurationsSuccessActionPayload",
      "details": {
        "fields": [
          {
            "name": "data",
            "optional": false,
            "type": {
              "kind": "interface",
              "name": "NormalizedBookingDurationsResponse",
              "baseName": "NormalizedBookingDurationsResponse",
              "details": {
                "fields": [
                  {
                    "name": "entities",
                    "optional": false,
                    "type": {
                      "kind": "object_literal",
                      "name": "{ bookingDurations: BookingDuration[]; bookingTypesDetails: BookingTypeDetails[]; }",
                      "baseName": "__type",
                      "details": {
                        "fields": [
                          {
                            "name": "bookingDurations",
                            "optional": false,
                            "type": {
                              "kind": "array",
                              "name": "BookingDuration[]",
                              "baseName": "BookingDuration[]",
                              "details": {
                                "elementType": {
                                  "kind": "interface",
                                  "name": "BookingDuration",
                                  "baseName": "BookingDuration",
                                  "details": {
                                    "fields": [
                                      {
                                        "name": "id",
                                        "optional": false,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "number",
                                          "baseName": "number"
                                        }
                                      },
                                      {
                                        "name": "bookingType",
                                        "optional": false,
                                        "type": {
                                          "kind": "union",
                                          "name": "BookingType",
                                          "baseName": "BookingType",
                                          "details": {
                                            "types": [
                                              {
                                                "kind": "primitive",
                                                "name": "\"appliance_delivery_complex\" | \"appliance_delivery_simple\" | \"appliance_removal\" | \"cavities\" | \"delivery_complex\" | \"delivery_simple\" | \"end_of_treatment\" | \"end_of_treatment_complex\" | \"end_of_treatment_simple\" | \"facial_harmonization_complex\" | \"facial_harmonization_simple\" | \"first\" | \"first_dw_impress\" | \"first_experimental\" | \"first_facial_harmonization\" | \"first_implants\" | \"first_internal\" | \"first_online\" | \"first_onsite\" | \"follow_up\" | \"follow_up_ipr\" | \"follow_up_ipr_internal\" | \"follow_up_online\" | \"follow_up_urgent\" | \"hygiene\" | \"maintenance_complex\" | \"maintenance_online\" | \"maintenance_referred\" | \"maintenance_simple\" | \"micro_implantology\" | \"odontology_complex\" | \"odontology_simple\" | \"onboarding\" | \"onboarding_1\" | \"onboarding_2\" | \"onboarding_3\" | \"onboarding_4\" | \"onboarding_5\" | \"onboarding_6\" | \"onboarding_7\" | \"oral_surgery\" | \"outlier\" | \"outlier_autobooking\" | \"periodontics\" | \"preworks\" | \"professional_whitening\" | \"receive_kit\" | \"records\" | \"refinement_delivery\" | \"refinement_maintenance\" | \"rescan\" | \"restart\"",
                                                "baseName": "\"appliance_delivery_complex\" | \"appliance_delivery_simple\" | \"appliance_removal\" | \"cavities\" | \"delivery_complex\" | \"delivery_simple\" | \"end_of_treatment\" | \"end_of_treatment_complex\" | \"end_of_treatment_simple\" | \"facial_harmonization_complex\" | \"facial_harmonization_simple\" | \"first\" | \"first_dw_impress\" | \"first_experimental\" | \"first_facial_harmonization\" | \"first_implants\" | \"first_internal\" | \"first_online\" | \"first_onsite\" | \"follow_up\" | \"follow_up_ipr\" | \"follow_up_ipr_internal\" | \"follow_up_online\" | \"follow_up_urgent\" | \"hygiene\" | \"maintenance_complex\" | \"maintenance_online\" | \"maintenance_referred\" | \"maintenance_simple\" | \"micro_implantology\" | \"odontology_complex\" | \"odontology_simple\" | \"onboarding\" | \"onboarding_1\" | \"onboarding_2\" | \"onboarding_3\" | \"onboarding_4\" | \"onboarding_5\" | \"onboarding_6\" | \"onboarding_7\" | \"oral_surgery\" | \"outlier\" | \"outlier_autobooking\" | \"periodontics\" | \"preworks\" | \"professional_whitening\" | \"receive_kit\" | \"records\" | \"refinement_delivery\" | \"refinement_maintenance\" | \"rescan\" | \"restart\""
                                              }
                                            ]
                                          }
                                        }
                                      },
                                      {
                                        "name": "duration",
                                        "optional": false,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "number",
                                          "baseName": "number"
                                        }
                                      },
                                      {
                                        "name": "deletedAt",
                                        "optional": false,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "string | null",
                                          "baseName": "string | null"
                                        }
                                      }
                                    ]
                                  }
                                }
                              }
                            }
                          },
                          {
                            "name": "bookingTypesDetails",
                            "optional": false,
                            "type": {
                              "kind": "array",
                              "name": "BookingTypeDetails[]",
                              "baseName": "BookingTypeDetails[]",
                              "details": {
                                "elementType": {
                                  "kind": "interface",
                                  "name": "BookingTypeDetails",
                                  "baseName": "BookingTypeDetails",
                                  "details": {
                                    "fields": [
                                      {
                                        "name": "bookingType",
                                        "optional": false,
                                        "type": {
                                          "kind": "union",
                                          "name": "BookingType",
                                          "baseName": "BookingType",
                                          "details": {
                                            "types": [
                                              {
                                                "kind": "primitive",
                                                "name": "\"appliance_delivery_complex\" | \"appliance_delivery_simple\" | \"appliance_removal\" | \"cavities\" | \"delivery_complex\" | \"delivery_simple\" | \"end_of_treatment\" | \"end_of_treatment_complex\" | \"end_of_treatment_simple\" | \"facial_harmonization_complex\" | \"facial_harmonization_simple\" | \"first\" | \"first_dw_impress\" | \"first_experimental\" | \"first_facial_harmonization\" | \"first_implants\" | \"first_internal\" | \"first_online\" | \"first_onsite\" | \"follow_up\" | \"follow_up_ipr\" | \"follow_up_ipr_internal\" | \"follow_up_online\" | \"follow_up_urgent\" | \"hygiene\" | \"maintenance_complex\" | \"maintenance_online\" | \"maintenance_referred\" | \"maintenance_simple\" | \"micro_implantology\" | \"odontology_complex\" | \"odontology_simple\" | \"onboarding\" | \"onboarding_1\" | \"onboarding_2\" | \"onboarding_3\" | \"onboarding_4\" | \"onboarding_5\" | \"onboarding_6\" | \"onboarding_7\" | \"oral_surgery\" | \"outlier\" | \"outlier_autobooking\" | \"periodontics\" | \"preworks\" | \"professional_whitening\" | \"receive_kit\" | \"records\" | \"refinement_delivery\" | \"refinement_maintenance\" | \"rescan\" | \"restart\"",
                                                "baseName": "\"appliance_delivery_complex\" | \"appliance_delivery_simple\" | \"appliance_removal\" | \"cavities\" | \"delivery_complex\" | \"delivery_simple\" | \"end_of_treatment\" | \"end_of_treatment_complex\" | \"end_of_treatment_simple\" | \"facial_harmonization_complex\" | \"facial_harmonization_simple\" | \"first\" | \"first_dw_impress\" | \"first_experimental\" | \"first_facial_harmonization\" | \"first_implants\" | \"first_internal\" | \"first_online\" | \"first_onsite\" | \"follow_up\" | \"follow_up_ipr\" | \"follow_up_ipr_internal\" | \"follow_up_online\" | \"follow_up_urgent\" | \"hygiene\" | \"maintenance_complex\" | \"maintenance_online\" | \"maintenance_referred\" | \"maintenance_simple\" | \"micro_implantology\" | \"odontology_complex\" | \"odontology_simple\" | \"onboarding\" | \"onboarding_1\" | \"onboarding_2\" | \"onboarding_3\" | \"onboarding_4\" | \"onboarding_5\" | \"onboarding_6\" | \"onboarding_7\" | \"oral_surgery\" | \"outlier\" | \"outlier_autobooking\" | \"periodontics\" | \"preworks\" | \"professional_whitening\" | \"receive_kit\" | \"records\" | \"refinement_delivery\" | \"refinement_maintenance\" | \"rescan\" | \"restart\""
                                              }
                                            ]
                                          }
                                        }
                                      },
                                      {
                                        "name": "color",
                                        "optional": false,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "string",
                                          "baseName": "string"
                                        }
                                      },
                                      {
                                        "name": "group",
                                        "optional": true,
                                        "type": {
                                          "kind": "union",
                                          "name": "BookingTypeGroup | null | undefined",
                                          "baseName": "BookingTypeGroup | null | undefined",
                                          "details": {
                                            "types": [
                                              {
                                                "kind": "primitive",
                                                "name": "undefined | null | \"follow_up\" | \"onboarding\" | \"first_visit\" | \"first_visit_dw\" | \"prework\"",
                                                "baseName": "undefined | null | \"follow_up\" | \"onboarding\" | \"first_visit\" | \"first_visit_dw\" | \"prework\""
                                              }
                                            ]
                                          }
                                        }
                                      },
                                      {
                                        "name": "defaultDuration",
                                        "optional": true,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "number | undefined",
                                          "baseName": "number | undefined"
                                        }
                                      },
                                      {
                                        "name": "medicalActIds",
                                        "optional": true,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "string[] | undefined",
                                          "baseName": "string[] | undefined"
                                        }
                                      },
                                      {
                                        "name": "deletedAt",
                                        "optional": false,
                                        "type": {
                                          "kind": "primitive",
                                          "name": "string | null",
                                          "baseName": "string | null"
                                        }
                                      }
                                    ]
                                  }
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "actionPayload",
            "optional": false,
            "type": {
              "kind": "object_literal",
              "name": "FetchBookingDurationsActionPayload",
              "baseName": "FetchBookingDurationsActionPayload",
              "details": {
                "fields": [
                  {
                    "name": "clinicId",
                    "optional": false,
                    "type": {
                      "kind": "primitive",
                      "name": "number",
                      "baseName": "number"
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "kind": "primitive",
      "name": "string",
      "baseName": "string"
    }
  ]
}
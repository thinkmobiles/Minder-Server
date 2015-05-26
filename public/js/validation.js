define(
    function () {
        //Removed cyrillic chars
        var phoneRegExp = /^[0-9\+]?([0-9-\s()])+[0-9()]$/,
            intNumberRegExp = /[0-9]+/,
            nameRegExp = /^[a-zA-Z]+[a-zA-Z-_\s]+$/,
            nameRegExp = /^[a-zA-Z-_\s]+$/,
            groupsNameRegExp = /[a-zA-Z0-9]+[a-zA-Z0-9-,#@&*-_\s()\.\/\s]+$/,
            loginRegExp = /[\w\.@]{6,100}$/,
            passRegExp = /^[\w\.@]{3,100}$/,
            skypeRegExp = /^[\w\._@]{6,100}$/,
            workflowRegExp = /^[a-zA-Z0-9\s]{2,100}$/,
            invalidCharsRegExp = /[~<>\^\*₴]/,
            countryRegExp = /[a-zA-Z\s-]+/,
            zipRegExp = /[a-zA-Z0-9\s-]+$/,
            streetRegExp = /^[a-zA-Z0-9\s][a-zA-Z0-9-,\s\.\/\s]+$/,
            moneyAmountRegExp = /^([0-9]{1,9})\.?([0-9]{1,2})?$/,
            emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            loggedRegExp = /^([0-9]{1,9})\.?([0-9]{1,2})?$/;
        var MIN_LENGTH = 2,
            LOGIN_MIN_LENGTH = 6,
            WORKFLOW_MIN_LENGTH = 3;

        var validateEmail = function (validatedString) {
            return emailRegExp.test(validatedString);
        };

        var validateLogin = function (validatedString) {
            return loginRegExp.test(validatedString);
        };

        var validateSkype = function (validatedString) {
            return skypeRegExp.test(validatedString);
        };

        var validateZip = function (validatedString) {
            return zipRegExp.test(validatedString);
        };

        var requiredFieldLength = function (validatedString) {
            return validatedString.length >= MIN_LENGTH;
        };

        var validatePhone = function (validatedString) {
            return phoneRegExp.test(validatedString);
        };

        var validateName = function (validatedString) {
            return nameRegExp.test(validatedString);
        };

        var validateGroupsName = function (validatedString) {
            return groupsNameRegExp.test(validatedString);
        };
        var validateWorkflowName = function (validatedString) {
            return workflowRegExp.test(validatedString);
        };

        var validatePass = function (validatedString) {
            return passRegExp.test(validatedString);
        };

        var validateCountryName = function (validatedString) {
            return countryRegExp.test(validatedString);
        };

        var validateStreet = function (validatedString) {
            return streetRegExp.test(validatedString);
        };

        var validateLoggedValue = function (validatedString) {
            return loggedRegExp.test(validatedString);
        };

        var validateNumber = function (validatedString) {
            return intNumberRegExp.test(validatedString);
        };

        var validateMoneyAmount = function (validatedString) {
            return moneyAmountRegExp.test(validatedString);
        };

        var validDate = function (validatedString) {
            return new Date(validatedString).getMonth() ? true : false;
        };

        var hasInvalidChars = function (validatedString) {
            return invalidCharsRegExp.test(validatedString);
        };

        var errorMessages = {
            invalidNameMsg: "field value is incorrect. field can not contain '~ < > ^ * ₴' signs only a-z A-Z",
            invalidLoginMsg: "field value is incorrect. It should contain only the following symbols: A-Z, a-z, 0-9, _ @",
            notNumberMsg: "field should contain a valid integer value",
            invalidCountryMsg: "field should contain only letters, whitespaces and '-' sign",
            loggedNotValid: "field should contain a valid decimal value with max 1 digit after dot",
            minLengthMsg: function (minLength) {
                return "field should be at least " + minLength + " characters long"
            },
            maxLengthMsg: function (maxLength) {
                return "field should be at least " + maxLength + " characters long"
            },
            invalidMoneyAmountMsg: "field should contain a number with max 2 digits after dot",
            invalidEmailMsg: "field should contain a valid email address",
            requiredMsg: "field can not be empty",
            invalidCharsMsg: "field can not contain '~ < > ^ * ₴' signs",
            invalidStreetMsg: "field can contain only letters, numbers and '. , - /' signs",
            invalidPhoneMsg: "field should contain only numbers and '+ - ( )' signs",
            invalidZipMsg: "field should contain only letters, numbers and '-' sing",
            passwordsNotMatchMsg: "Password and confirm password field do not match"
        };


        var checkNameField = function (errorArray, required, fieldValue, fieldName) {
            if (required) {
                if (!fieldValue) {
                    errorArray.push([fieldName, errorMessages.requiredMsg].join(' '));
                    return;
                }
                //if (hasInvalidChars(fieldValue)) {
                //    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                //    return;
                //}
                //if (fieldValue.length < MIN_LENGTH) {
                //    errorArray.push([fieldName, errorMessages.minLengthMsg(MIN_LENGTH)].join(' '));
                //    return;
                //}
                if (fieldValue.length > 35) {
                    errorArray.push([fieldName, errorMessages.maxLengthMsg(35)].join(' '));
                    return;
                }
                if (fieldValue.length > 35) {
                    errorArray.push([fieldName, errorMessages.maxLengthMsg(35)].join(' '));
                    return;
                }
                //if (fieldValue.length < 2) {
                //    errorArray.push([fieldName, errorMessages.minLengthMsg(2)].join(' '));
                //    return;
                //}
                //if (!validateName(fieldValue)) errorArray.push([fieldName, errorMessages.invalidNameMsg].join(' '));
            } else {
                if (fieldValue) {
                    //if (hasInvalidChars(fieldValue)) {
                    //    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                    //    return;
                    //}
                    if (fieldValue.length > 35) {
                        errorArray.push([fieldName, errorMessages.maxLengthMsg(35)].join(' '));
                        return;
                    }
                    /*if (fieldValue.length < 1) {
                        errorArray.push([fieldName, errorMessages.minLengthMsg(1)].join(' '));
                        return;
                    }*/
                    //if (!validateName(fieldValue)) errorArray.push([fieldName, errorMessages.invalidNameMsg].join(' '));
                }
            }
        };

        var checkLogedField = function (errorArray, required, fieldValue, fieldName) {
            if (required) {
                if (!fieldValue) {
                    errorArray.push([fieldName, errorMessages.requiredMsg].join(' '));
                    return;
                }
                if (hasInvalidChars(fieldValue)) {
                    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                    return;
                }
                if (fieldValue.length < MIN_LENGTH) {
                    errorArray.push([fieldName, errorMessages.minLengthMsg(MIN_LENGTH)].join(' '));
                    return;
                }
                if (!validateLoggedValue(fieldValue)) errorArray.push([fieldName, errorMessages.invalidNameMsg].join(' '));
            } else {
                if (fieldValue) {
                    if (hasInvalidChars(fieldValue)) {
                        errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                        return;
                    }
                    if (!validateLoggedValue(fieldValue)) errorArray.push([fieldName, errorMessages.invalidNameMsg].join(' '));
                }
            }
        };

        var checkLoginField = function (errorArray, required, fieldValue, fieldName) {
            if (required) {
                if (!fieldValue) {
                    errorArray.push([fieldName, errorMessages.requiredMsg].join(' '));
                    return;
                }
                if (hasInvalidChars(fieldValue)) {
                    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                    return;
                }
                if (fieldValue.length < LOGIN_MIN_LENGTH) {
                    errorArray.push([fieldName, errorMessages.minLengthMsg(LOGIN_MIN_LENGTH)].join(' '));
                    return;
                }
                if (!validateLogin(fieldValue)) errorArray.push([fieldName, errorMessages.invalidLoginMsg].join(' '));
            } else {
                if (fieldValue) {
                    if (hasInvalidChars(fieldValue)) {
                        errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                        return;
                    }
                    if (fieldValue.length < MIN_LENGTH) {
                        errorArray.push([fieldName, errorMessages.minLengthMsg(6)].join(' '));
                        return;
                    }
                    if (!validateName(fieldValue)) errorArray.push([fieldName, errorMessages.invalidLoginMsg].join(' '));
                }
            }
        };

        var checkEmailField = function (errorArray, required, fieldValue, fieldName) {
            if (required) {
                if (!fieldValue) {
                    errorArray.push([fieldName, errorMessages.requiredMsg].join(' '));
                    return;
                }
                if (hasInvalidChars(fieldValue)) {
                    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                    return;
                }
                if (!validateEmail(fieldValue)) errorArray.push([fieldName, errorMessages.invalidEmailMsg].join(' '));
            } else {
                if (fieldValue) {
                    if (hasInvalidChars(fieldValue)) {
                        errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                        return;
                    }
                    if (!validateEmail(fieldValue)) errorArray.push([fieldName, errorMessages.invalidEmailMsg].join(' '));
                }
            }
        };

        var checkPasswordField = function (errorArray, required, fieldValue, fieldName) {
            if (required) {
                if (!fieldValue) {
                    errorArray.push([fieldName, errorMessages.requiredMsg].join(' '));
                    return;
                }
                if (hasInvalidChars(fieldValue)) {
                    errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                    return;
                }
                if (fieldValue.length < 6) {
                    errorArray.push([fieldName, errorMessages.minLengthMsg(6)].join(' '));
                    return;
                }
                if (fieldValue.length > 35) {
                    errorArray.push([fieldName, errorMessages.maxLengthMsg(35)].join(' '));
                    return;
                }
                if (!validatePass(fieldValue)) errorArray.push([fieldName, errorMessages.invalidLoginMsg].join(' '));
            } else {
                if (fieldValue) {
                    if (hasInvalidChars(fieldValue)) {
                        errorArray.push([fieldName, errorMessages.invalidCharsMsg].join(' '));
                        return;
                    }
                    if (fieldValue.length < 6) {
                        errorArray.push([fieldName, errorMessages.minLengthMsg(6)].join(' '));
                        return;
                    }
                    if (fieldValue.length > 35) {
                        errorArray.push([fieldName, errorMessages.maxLengthMsg(35)].join(' '));
                        return;
                    }
                    if (!validatePass(fieldValue)) errorArray.push([fieldName, errorMessages.invalidLoginMsg].join(' '));
                }
            }
        };

        var comparePasswords = function (errorArray, password, confirmPass) {
            if (password && confirmPass)
                if (password !== confirmPass)
                    errorArray.push(errorMessages.passwordsNotMatchMsg);
        };

        return {
            comparePasswords: comparePasswords,
            checkPasswordField: checkPasswordField,
            checkLoginField: checkLoginField,
            checkEmailField: checkEmailField,
            checkNameField: checkNameField,
            validEmail: validateEmail,
            withMinLength: requiredFieldLength,
            validLoggedValue: validateLoggedValue,
            validStreet: validateStreet,
            validDate: validDate,
            validPhone: validatePhone,
            validName: validateName,
            validGroupsName: validateGroupsName,
            validMoneyAmount: validateMoneyAmount,
            checkLogedField: checkLogedField
        }
    });

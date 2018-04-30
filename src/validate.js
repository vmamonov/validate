(function() {
    /**
     * Стандартный набор валидаторов
     *
     * Добавить/Обновить валидатор/ы
     * @see VALID_ERROR_CONTROLLER.attachValidator({'name' : function(){return bool} })
     *
     * Обращение к валидатору
     * @see VALID_ERROR_CONTROLLER.getValidator(name)
     */
    window.VALIDATORS = {
        'EQUAL' : function(needle, handle) {
            return needle === handle;
        },
        'REQUIRE' : function(value) {
            return '' !== value;
        },
        'CYRILLIC_LNG' : function(value) {
            let beforeCheck = value,
                afterCheck = beforeCheck.replace(/[^а-яА-Я]*/g, '');
            return (0 === beforeCheck.length - afterCheck.length);
        },
        'EMAIL' : function(value) {
            let reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
            return reg.test(value);
        }
    };


    /**
     * Обработчик после работы валилатора - добавление/удаление текста ошибок
     * @param inputMessage  Текст сообщения об ошибке
     */
    function errMsgHandler(inputMessage) {
        var errorMsg = inputMessage || 'Ошибка',
            errorBlock = '<div class="text-danger error-msg" data-validatorId="' + errMsgHandler.vId + '">' + errorMsg + '</div>',
            errorMsgJqObj = $('div[data-validatorId=' + errMsgHandler.vId + ']');
        if (true === errMsgHandler.validStatus) {
            errorMsgJqObj.remove();
        } else {
            if (0 === errorMsgJqObj.length) {
                let validateField = $(errMsgHandler.validateJqObj);
                validateField.after(errorBlock);
                validateField.closest('.form-group').addClass('has-error');
            }
        }
    }


    /**
     * Обработчик после работы валилатора - удаляет в поле формы символы, которые не RU
     * @param value
     */
    function cleanNotCyrillicSymbHandler(value) {
        let beforeCheck = value,
            afterCheck = beforeCheck.replace(/[^а-яА-Я]*/g, '');
        if (0 !== beforeCheck.length - afterCheck.length) {
            $(errMsgHandler.validateJqObj).val(afterCheck);
        }
    }


    /**
     * Обработчик после работы валилатора - проверка поля на предмет того, не остались ли еще ошибки
     */
    function checkErrBox() {
        if($(errMsgHandler.validateJqObj).siblings('.error-msg').length === 0) {
            $(errMsgHandler.validateJqObj).closest('.form-group').removeClass('has-error').addClass('has-success');
        }
    }



    /**
     * Контроллер валидаторов формы
     * Предназначен для централизованного управление валидаторами, контроля их работы и текущим состоянием
     * @constructor
     */
    function VALID_ERROR_CONTROLLER() {
        var
            self = this,
            // Валидаторы, которые были взяты под контроль
            attachValid = {},
            // Добавленные обработчики результатов работы валидаторов
            attachValidHandlers = {},
            // Результат работы валидаторов
            validStatus = {};

        /**
         * Получение результата работы конктретно экземпляра валидатора
         * @param vId Идентификатор валидатора
         * @return bool
         */
        self.getValidStatus = function(vId) {
            return validStatus[vId];
        };


        /**
         * Отправить форму
         * @param idForm
         */
        self.sendForm = function(idForm) {
            if (self.hasError()) {
                return;
            }
            $(idForm).submit();
        };


        /**
         * Сохранение результата работы валидаторов
         * @param vId Идентификатор валидатора
         * @param result
         */
        self.saveValidResult = function(vId, result) {
            validStatus[vId] = result;
        };


        /**
         * Метод-обертка для работы с конкретным валидатором
         * @param validName text Имя валидатора, которое ранее было привязано в attachValidator()
         */
        self.getValidator = function(validName) {
            return new function() {
                    // JQ-объект валидируемого поля
                let validateJqObj,

                    // результат работы текущего экземпляра вадидатора (vId)
                    validStatus,

                    /* Идентификатор экземпляра вадидатора. Т.к один валидатор может применяться к разным полям, то
                    на каждое поле заводится свой vId. Например REQUIRE(обязательное поле) может быть применен
                    к таким полям, как имя, email и т.д. На каждое из них создается отдельный vId, чтобы они
                    не зависили друг от друга */
                    vId;

                /**
                 * Привязка валидатора к полю, которое он будет валидировать. Обязательный параметр
                 * @param jqObj
                 * @return {VALID_ERROR_CONTROLLER.getValidator}
                 */
                this.applyTo = function(jqObj) {
                    validateJqObj = $(jqObj);
                    vId = validName + validateJqObj.attr('id') + validateJqObj.attr('name');
                    return this;
                };

                /**
                 * Получить обработчик результатов работы валидатора
                 * @param handleName Имя обработчика, привязанное через VALID_ERROR_CONTROLLER.attachHandlersAfterValid()
                 * @param params Аргументы передаваемые в функцию-обработчик
                 * @return {VALID_ERROR_CONTROLLER.getValidator}
                 */
                this.processingAfterValidation = function(handleName, params) {
                    if (!vId) {
                        console.log('Required parameter - the identifier of the validator (vId) is not specified');
                    }

                    let handler = self.getHandlerAfterValid(handleName);
                    handler.vId = vId;
                    handler.validateJqObj = validateJqObj;
                    handler.validStatus = validStatus;
                    if (!Array.isArray(params)) {
                        params = [params];
                    }
                    handler.apply(this, params);
                    return this;
                };

                /**
                 * Запуск валидатора и передача в него параметров
                 * @return {*}
                 */
                this.run = function() {
                    if (!vId) {
                        console.log('Required parameter - the identifier of the validator (vId) is not specified');
                    }

                    if ('undefined' === typeof attachValid[validName]) {
                        console.log('Validator "' + validName + '" not be attached to VALID_ERROR_CONTROLLER');
                        return self;
                    }
                    validStatus = attachValid[validName].apply(this, arguments);

                    self.saveValidResult(vId, validStatus);
                    return this;
                }
            };
        };


        /**
         * Получить обработчик результатов работы валидатора
         * @param handlerName Имя обработчика, привязанное через VALID_ERROR_CONTROLLER.attachHandlersAfterValid()
         * @return {*}
         */
        self.getHandlerAfterValid = function(handlerName) {
            if ('undefined' === typeof attachValidHandlers[handlerName]) {
                return function() {
                    console.log('Handler after validation "' + handlerName + '" not be attached to VALID_ERROR_CONTROLLER');
                };
            }
            return attachValidHandlers[handlerName];
        };


        /**
         * Привязать валидатор/ы для контроля их дальнейшей работы
         * @param validatorsList Объект со списком валидатора/ов в формате {'NAME' : validator}
         * @return {VALID_ERROR_CONTROLLER}
         */
        self.attachValidator = function(validatorsList) {
            attachValid = $.extend(attachValid, validatorsList);
            return self;
        };


        /**
         * Привязать обработчик результатов работы валидатора
         * @param validHandlersList
         * @return {VALID_ERROR_CONTROLLER}
         */
        self.attachHandlersAfterValid = function(validHandlersList) {
            attachValidHandlers = $.extend(attachValidHandlers, validHandlersList);
            return self;
        };


        /**
         * Проверка на наличие ошибок валидации
         * @return {boolean}
         */
        self.hasError = function() {
            for (var item in validStatus) {
                if (false === validStatus[item]) {
                    return true;
                }
            }
            return false;
        };
    }

    window.validErrCtrl = new VALID_ERROR_CONTROLLER();
    window.validErrCtrl.attachValidator(window.VALIDATORS);
    window.validErrCtrl.attachHandlersAfterValid({
        'MSG_ERR' : errMsgHandler, 
        'CHECK_ERR_BOX' : checkErrBox,
        'CLEAN_NOT_CYRILLIC_SYMBOLS' : cleanNotCyrillicSymbHandler
    });
})();
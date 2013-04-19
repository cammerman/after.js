(function() {
    var after = {};

    var _promise = (function () {
        var ctor = function (pending) {
            var that = this;
            var _state;
            var _stateValue;
            var _onFulfilled = [];
            var _onRejected = [];

            this.then = function (onFulfilled, onRejected) {
                var pending = _pending();

                if (typeof onFulfilled === 'function') {
                    _onFulfilled.push(function (value) {
                        try {
                            var value2 = onFulfilled(value);
                        } catch (e) {
                            pending.reject(e);
                            return;
                        }

                        if (value2 !== null && value2 !== undefined) {
                            pending.fulfill(value2);
                            return;
                        }

                        pending.fulfill(value1);
                        return;
                    });
                }

                if (typeof onRejected === 'function') {
                    _onRejected.push(function (value) {
                        try {
                            var value2 = onRejected(value);
                        } catch (e) {
                            pending.reject(e);
                            return;
                        }

                        if (value2 !== null && value2 !== undefined) {
                            pending.fulfill(value2);
                            return;
                        }

                        pending.fulfill(value1);
                        return;
                    });
                }

                if (_state == 'fulfilled')
                {
                    setTimeout(function () { fulfill(stateValue); }, 0);
                }

                if (_state == 'rejected')
                {
                    setTimeout(function () { reject(stateValue); }, 0);
                }

                return pending.promise;
            };

            pending.promise = this;

            pending.fulfill = function (value) {
                _state = 'fulfilled';
                _stateValue = value;

                var fulfillers = _onFulfilled.slice();
                _onFulfilled = [];
                _onRejected = [];

                for (var fulfillerIndex = 0; fulfillerIndex < fulfillers.length; fulfillerIndex++) {
                    fulfillers[fulfillerIndex](value);
                }
            };;

            pending.reject = function (reason) {
                _state = 'rejected';
                _stateValue = reason;

                var rejectors = _onRejected.slice();
                _onRejected = [];
                _onFulfilled = [];

                for (var rejectorIndex = 0; rejectorIndex < rejectors.length; rejectorIndex++) {
                    rejectors[rejectorIndex](reason);
                }
            };
        };

        return ctor;
    })();

    var _pending = function () {
        var pending = {};
        new _promise(pending);
        return pending;
    };

    var _fulfilled = function (value) {
        var pending = _pending();
        pending.fulfill(value);
        return pending.promise;
    };

    var _rejected = function (reason) {
        var pending = _pending();
        pending.reject(reason);
        return pending.promise;
    };

    after = {
        promise: _promise,
        pending: _pending,
        fulfilled: _fulfilled,
        rejected: _rejected
    };

    if (typeof define === 'function') {
        define([], function () {
            return after;
        });
    } else {
        this.After = after;
    }
})();
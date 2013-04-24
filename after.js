(function() {
    var after = {};

    var _Promise = (function () {
        var ctor = function (pendingContainer) {
            var _state = 'pending';
            var _stateValue;
            var _onFulfilled = [];
            var _onRejected = [];

            var _wrapListener = function (thenPending, rawListener) {
                return function (value) {
                    try {
                        var value2 = rawListener(value);
                    } catch (e) {
                        thenPending.reject(e);
                        return;
                    }

                    if (value2 !== null && value2 !== undefined) {
                        thenPending.fulfill(value2);
                        return;
                    }

                    thenPending.fulfill(value);
                    return;
                };
            };

            this.then = function (onFulfilled, onRejected) {
                var thenPending = _pending();

                if (typeof onFulfilled === 'function') {
                    _onFulfilled.push(
                        _wrapListener(thenPending, onFulfilled));
                }

                if (typeof onRejected === 'function') {
                    _onRejected.push(
                        _wrapListener(thenPending, onRejected));
                }

                if (_state == 'fulfilled')
                {
                    setTimeout(function () {
                        pendingContainer.fulfill(_stateValue);
                    }, 0);
                }

                if (_state == 'rejected')
                {
                    setTimeout(function () {
                        pendingContainer.reject(_stateValue);
                    }, 0);
                }

                return thenPending.promise;
            };

            pendingContainer.promise = this;

            pendingContainer.fulfill = function (value) {
                if (_state === 'pending') {
                    _state = 'fulfilled';
                    _stateValue = value;
                }

                if (_state === 'fulfilled') {
                    var fulfillers = _onFulfilled.slice();
                    _onFulfilled = [];
                    _onRejected = [];

                    for (var fulfillerIndex = 0; fulfillerIndex < fulfillers.length; fulfillerIndex++) {
                        fulfillers[fulfillerIndex](value);
                    }
                }
            };

            pendingContainer.reject = function (reason) {
                if (_state === 'pending') {
                    _state = 'rejected';
                    _stateValue = reason;
                }

                if (_state === 'rejected') {
                    var rejectors = _onRejected.slice();
                    _onRejected = [];
                    _onFulfilled = [];

                    for (var rejectorIndex = 0; rejectorIndex < rejectors.length; rejectorIndex++) {
                        rejectors[rejectorIndex](reason);
                    }
                }
            };
        };

        return ctor;
    })();

    var _pending = function () {
        var pending = {};
        new _Promise(pending);
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
        Promise: _Promise,
        pending: _pending,
        fulfilled: _fulfilled,
        rejected: _rejected
    };

    if (typeof exports !== 'undefined') {
        exports.Promise = _Promise;
        exports.pending = _pending;
        exports.fulfilled = _fulfilled;
        exports.rejected = _rejected;
    } else if (typeof define === 'function') {
        define([], function () {
            return after;
        });
    } else {
        this.After = after;
    }
})();
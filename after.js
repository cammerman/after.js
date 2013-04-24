(function() {
    var after = {};

    var nextTick = (
        (typeof process === 'undefined')
            ? function browserNextTick(callback) {
                setTimeout(callback, 0);
            }
            : function nodeNextTick(callback) {
                process.nextTick(callback);
            }
    );

    var _Promise = (function () {
        function ctor(pendingContainer) {
            var _state = 'pending';
            var _stateValue;
            var _onFulfilled = [];
            var _onRejected = [];

            function createChainedFulfillmentListener(dependentPromise) {
                return function chainedFulfillmentListener(value) {
                    nextTick(function () {
                        dependentPromise.fulfill(value);
                    });
                }
            }

            function createChainedRejectionListener(dependentPromise) {
                return function chainedRejectionListener(reason) {
                    nextTick(function () {
                        dependentPromise.reject(reason);
                    });
                }
            }

            function _wrapListener(dependentPromise, rawListener) {
                return function wrappedListener(value) {
                    try {
                        var value2 = rawListener(value);
                    } catch (e) {
                        dependentPromise.reject(e);
                        return;
                    }

                    if (value2 && typeof(value2.then) === 'function') {
                        value2.then(
                            createChainedFulfillmentListener(dependentPromise),
                            createChainedRejectionListener(dependentPromise));
                    } else {
                        dependentPromise.fulfill(value2);
                    }
                };
            };

            this.then = function (onFulfilled, onRejected) {
                var dependentPromise = _pending();

                if (typeof onFulfilled === 'function') {
                    _onFulfilled.push(
                        _wrapListener(dependentPromise, onFulfilled));
                } else {
                    _onFulfilled.push(
                        createChainedFulfillmentListener(dependentPromise));
                }

                if (typeof onRejected === 'function') {
                    _onRejected.push(
                        _wrapListener(dependentPromise, onRejected));
                } else {
                    _onRejected.push(
                        createChainedRejectionListener(dependentPromise));
                }

                if (_state == 'fulfilled')
                {
                    nextTick(function () {
                        pendingContainer.fulfill(_stateValue);
                    }, 0);
                }

                if (_state == 'rejected')
                {
                    nextTick(function () {
                        pendingContainer.reject(_stateValue);
                    }, 0);
                }

                return dependentPromise.promise;
            };

            pendingContainer.promise = this;

            pendingContainer.fulfill = function (value) {
                if (_state === 'pending') {
                    _state = 'fulfilled';
                    _stateValue = value;
                }

                if (_state === 'fulfilled') {
                    var fulfillers = _onFulfilled;
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
                    var rejectors = _onRejected;
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

    function _pending() {
        var pending = {};
        new _Promise(pending);
        return pending;
    };

    function _fulfilled(value) {
        var pending = _pending();
        pending.fulfill(value);
        return pending.promise;
    };

    function _rejected(reason) {
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
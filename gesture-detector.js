// 檢測和發出觸摸手勢事件的組件

AFRAME.registerComponent("gesture-detector", {
    schema: {
        element: { default: "" }
    },

    init: function() {
        this.targetElement =
            this.data.element && document.querySelector(this.data.element);

        if (!this.targetElement) {
            this.targetElement = this.el;
        }

        this.internalState = {
            previousState: null
        };

        this.emitGestureEvent = this.emitGestureEvent.bind(this);

        this.targetElement.addEventListener("touchstart", this.emitGestureEvent);

        this.targetElement.addEventListener("touchend", this.emitGestureEvent);

        this.targetElement.addEventListener("touchmove", this.emitGestureEvent);
    },

    remove: function() {
        this.targetElement.removeEventListener("touchstart", this.emitGestureEvent);

        this.targetElement.removeEventListener("touchend", this.emitGestureEvent);

        this.targetElement.removeEventListener("touchmove", this.emitGestureEvent);
    },

    emitGestureEvent(event) {
        const currentState = this.getTouchState(event);

        const previousState = this.internalState.previousState;

        const gestureContinues =
            previousState &&
            currentState &&
            currentState.touchCount == previousState.touchCount;

        const gestureEnded = previousState && !gestureContinues;

        const gestureStarted = currentState && !gestureContinues;

        if (gestureEnded) {
            const eventName =
                this.getEventPrefix(previousState.touchCount) + "fingerend";

            this.el.emit(eventName, previousState);

            this.internalState.previousState = null;
        }

        if (gestureStarted) {
            currentState.startTime = performance.now();

            currentState.startPosition = currentState.position;

            currentState.startSpread = currentState.spread;

            const eventName =
                this.getEventPrefix(currentState.touchCount) + "fingerstart";

            this.el.emit(eventName, currentState);

            this.internalState.previousState = currentState;
        }

        if (gestureContinues) {
            const eventDetail = {
                positionChange: {
                    x: currentState.position.x - previousState.position.x,

                    y: currentState.position.y - previousState.position.y
                }
            };

            if (currentState.spread) {
                eventDetail.spreadChange = currentState.spread - previousState.spread;
            }

            // Update state with new data

            Object.assign(previousState, currentState);

            // Add state data to event detail

            Object.assign(eventDetail, previousState);

            const eventName =
                this.getEventPrefix(currentState.touchCount) + "fingermove";

            this.el.emit(eventName, eventDetail);
        }
    },

    getTouchState: function(event) {
        if (event.touches.length === 0) {
            return null;
        }

        // 將 event.touches 轉換為數組，以便我們可以使用 reduce

        const touchList = [];

        for (let i = 0; i < event.touches.length; i++) {
            touchList.push(event.touches[i]);
        }

        const touchState = {
            touchCount: touchList.length
        };

        // 計算所有當前觸摸的中心

        const centerPositionRawX =
            touchList.reduce((sum, touch) => sum + touch.clientX, 0) /
            touchList.length;

        const centerPositionRawY =
            touchList.reduce((sum, touch) => sum + touch.clientY, 0) /
            touchList.length;

        touchState.positionRaw = { x: centerPositionRawX, y: centerPositionRawY };

        // 按窗口尺寸的平均值縮放觸摸位置和擴展

        const screenScale = 2 / (window.innerWidth + window.innerHeight);

        touchState.position = {
            x: centerPositionRawX * screenScale,
            y: centerPositionRawY * screenScale
        };

        // 計算從中心點開始的平均觸摸範圍

        if (touchList.length >= 2) {
            const spread =
                touchList.reduce((sum, touch) => {
                    return (
                        sum +
                        Math.sqrt(
                            Math.pow(centerPositionRawX - touch.clientX, 2) +
                            Math.pow(centerPositionRawY - touch.clientY, 2)
                        )
                    );
                }, 0) / touchList.length;

            touchState.spread = spread * screenScale;
        }

        return touchState;
    },

    getEventPrefix(touchCount) {
        const numberNames = ["one", "two", "three", "many"];

        return numberNames[Math.min(touchCount, 4) - 1];
    }
});
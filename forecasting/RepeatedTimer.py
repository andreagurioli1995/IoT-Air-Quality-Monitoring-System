import time
from threading import Event, Thread

class RepeatedTimer:

    """Repeat `function` every `interval` seconds on a different thread."""

    def __init__(self, interval, function, *args, **kwargs):
        self.interval = interval
        self.function = function
        self.args = args
        self.kwargs = kwargs
        self.start = time.time()
        self.event = Event()
        self.thread = Thread(target=self._target)
        self.thread.start()

    def _target(self):
        """"If the `interval` is passed, the method performs the `function` on the assigned thread."""
        while not self.event.wait(self._time):
            self.function(*self.args, **self.kwargs)

    @property
    def _time(self):
        return self.interval - ((time.time() - self.start) % self.interval)

    def stop(self):
        """" Stop the thread"""
        self.event.set()
        self.thread.join()


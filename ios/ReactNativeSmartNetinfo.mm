#import "ReactNativeSmartNetinfo.h"
#import <Network/Network.h>

@implementation ReactNativeSmartNetinfo {
    nw_path_monitor_t _monitor;
    dispatch_queue_t _queue;
    BOOL _hasListeners;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _queue = dispatch_queue_create("com.smartnetinfo.networkmonitor", NULL);
        _monitor = nw_path_monitor_create();
        
        __weak ReactNativeSmartNetinfo *weakSelf = self;
        nw_path_monitor_set_update_handler(_monitor, ^(nw_path_t path) {
            nw_path_status_t status = nw_path_get_status(path);
            BOOL isConnected = (status == nw_path_status_satisfied);
            
            NSString *type = @"unknown";
            if (!isConnected) {
                type = @"none";
            } else if (nw_path_uses_interface_type(path, nw_interface_type_wifi)) {
                type = @"wifi";
            } else if (nw_path_uses_interface_type(path, nw_interface_type_cellular)) {
                type = @"cellular";
            }
            
            [weakSelf sendNetworkStatusEvent:isConnected type:type];
        });
        
        nw_path_monitor_set_queue(_monitor, _queue);
        nw_path_monitor_start(_monitor);
    }
    return self;
}

- (void)dealloc {
    if (_monitor) {
        nw_path_monitor_cancel(_monitor);
    }
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"NetworkStatusChanged"];
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

- (void)sendNetworkStatusEvent:(BOOL)isConnected type:(NSString *)type {
    if (_hasListeners) {
        [self sendEventWithName:@"NetworkStatusChanged" body:@{@"isConnected": @(isConnected), @"type": type}];
    }
}

- (void)addListener:(NSString *)eventName {
    [super addListener:eventName];
}

- (void)removeListeners:(double)count {
    [super removeListeners:count];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeReactNativeSmartNetinfoSpecJSI>(params);
}

@end

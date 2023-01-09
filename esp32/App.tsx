/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState} from 'react';
import {
    TouchableOpacity,
    Button,
    PermissionsAndroid,
    View,
    Text, Image,
} from 'react-native';

import base64 from 'react-native-base64';

import {BleManager, Device} from 'react-native-ble-plx';
import {styles} from './Styles/styles';
import {LogBox} from 'react-native';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const BLTManager = new BleManager();

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9cinnocon';
const MESSAGE_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';


function StringToBool(input: String) {
    if (input == '1') {
        return true;
    } else {
        return false;
    }
}

function BoolToString(input: boolean) {
    if (input == true) {
        return '1';
    } else {
        return '0';
    }
}

export default function App() {
    //Is a device connected?
    const [isConnected, setIsConnected] = useState(false);

    //What device is connected?
    const [connectedDevice, setConnectedDevice] = useState<Device>();

    const [message, setMessage] = useState('연결안됨');
    const [ppm, setPpm] = useState("");
    const [sppm, setSppm] = useState("");
    const [tem, setTem] = useState("");
    const [hum, setHum] = useState("");

    const setDateMassage = (value) => {
        const array = value.split("|");
        if(array.length >= 3) {
            setPpm(array[0]);

            if(array[0]) {
                const ppm = parseInt(array[0]);
                let isppm = "아주나쁨";
                if(ppm <= 250) {
                    isppm = "아주좋음";
                } else if (ppm <= 350) {
                    isppm = "좋음";
                } else if (ppm <= 400) {
                    isppm = "보통";
                } else if (ppm <= 600) {
                    isppm = "나쁨";
                }
                setSppm(isppm);
            }

            setTem(array[1]);
            setHum(array[2]);
        }
    }

    // Scans availbale BLT Devices and then call connectDevice
    async function scanDevices() {
        PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Permission Localisation Bluetooth',
                message: 'Requirement for Bluetooth',
                buttonNeutral: 'Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        ).then(answere => {
            console.log('scanning');
            // display the Activityindicator

            BLTManager.startDeviceScan(null, null, (error, scannedDevice) => {
                if (error) {
                    console.warn(error);
                }

                if (scannedDevice && scannedDevice.name == 'HomeCoffee HCBT-01') {
                    BLTManager.stopDeviceScan();
                    connectDevice(scannedDevice);
                }
            });

            // stop scanning devices after 5 seconds
            setTimeout(() => {
                BLTManager.stopDeviceScan();
            }, 5000);
        });
    }

    // handle the device disconnection (poorly)
    async function disconnectDevice() {
        console.log('Disconnecting start');

        if (connectedDevice != null) {
            const isDeviceConnected = await connectedDevice.isConnected();
            if (isDeviceConnected) {
                BLTManager.cancelTransaction('messagetransaction');
                BLTManager.cancelTransaction('nightmodetransaction');

                BLTManager.cancelDeviceConnection(connectedDevice.id).then(() => {
                    console.log('DC completed');
                    setMessage("연결안됨");
                });
            }

            const connectionStatus = await connectedDevice.isConnected();
            if (!connectionStatus) {
                setIsConnected(false);
            }
        }
    }


    //Connect the device and start monitoring characteristics
    async function connectDevice(device: Device) {
        console.log('connecting to Device:', device.name);

        device
            .connect({refreshGatt: 'OnConnected'})
            .then(device => {
                setConnectedDevice(device);
                setIsConnected(true);
                setMessage("연결됨");
                return device.discoverAllServicesAndCharacteristics();
            })
            .then(device => {
                //  Set what to do when DC is detected
                BLTManager.onDeviceDisconnected(device.id, (error, device) => {
                    console.log('Device DC');
                    setIsConnected(false);
                });

                let serviceuuid = SERVICE_UUID;
                let messageuuid = MESSAGE_UUID;

                device.services().then(services => {
                    services.forEach((service, i) => {
                        let count = i;
                        service.characteristics().then(c => {
                            console.log('characteristics :: ', i, c);
                            if (count === 2) {
                                console.log('now??');
                                serviceuuid = c[0].serviceUUID;
                                messageuuid = c[0].uuid;

                                //Message
                                device
                                    .readCharacteristicForService(serviceuuid, messageuuid)
                                    .then(valenc => {
                                        setDateMassage(base64.decode(valenc?.value));
                                    });


                                //monitor values and tell what to do when receiving an update

                                //Message
                                device.monitorCharacteristicForService(
                                    serviceuuid,
                                    messageuuid,
                                    (error, characteristic) => {
                                        if (characteristic?.value != null) {
                                            setDateMassage(base64.decode(characteristic?.value));
                                            console.log(
                                                'Message update received: ',
                                                base64.decode(characteristic?.value),
                                            );
                                        }
                                    },
                                    'messagetransaction',
                                );
                            }
                        })
                    });
                });

                console.log('Connection established');
            });
    }

    return (
        <View>
            <View style={{paddingBottom: 200}}></View>

            {/* Title */}
            <View style={styles.rowView}>
                <Text style={styles.titleText}>맑은여울 - 수질검사</Text>
            </View>
            {isConnected && (
                <View style={{margin: 10, padding: 10, borderWidth: 2, borderRadius: 15, borderColor: "#466dcc"}}>
                    <View style={{flexDirection : "row", alignItems: "center"}}>
                        <Image source={require('./assets/water.png')} style={{width: 30, height: 30}}/>
                        <Text style={{...styles.text, marginStart: 10, fontSize: 20, lineHeight: 24}}>{sppm} ({ppm}ppm)</Text>
                    </View>
                    <View style={{flexDirection : "row", alignItems: "center"}}>
                        <Image source={require('./assets/tem.png')} style={{width: 30, height: 30}}/>
                        <Text style={{...styles.text, marginStart: 10, fontSize: 20, lineHeight: 24}}>{tem}°C</Text>
                    </View>
                    <View style={{flexDirection : "row", alignItems: "center"}}>
                        <Image source={require('./assets/tum.png')} style={{width: 30, height: 30}}/>
                        <Text style={{...styles.text, marginStart: 10, fontSize: 20, lineHeight: 24}}>{hum}%</Text>
                    </View>
                </View>
                )}

            <View style={{paddingBottom: 20}}></View>

            {/* Connect Button */}
            <View style={styles.rowView}>
                <TouchableOpacity style={{width: 120}}>
                    {!isConnected ? (
                        <Button
                            title="기기연결"
                            onPress={() => {
                                scanDevices();
                            }}
                            disabled={false}
                        />
                    ) : (
                        <Button
                            title="연결취소"
                            onPress={() => {
                                disconnectDevice();
                            }}
                            disabled={false}
                        />
                    )}
                </TouchableOpacity>
            </View>

            <View style={{paddingBottom: 20}}></View>

            {/* Monitored Value */}

            <View style={styles.rowView}>
                <Text style={styles.baseText}>{message}</Text>
            </View>

            <View style={{paddingBottom: 20}}></View>

        </View>
    );
}

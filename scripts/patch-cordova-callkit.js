import fs from 'fs';
import path from 'path';

const pluginXmlPath = path.resolve('node_modules/cordova-plugin-callkit/plugin.xml');
if (fs.existsSync(pluginXmlPath)) {
  let content = fs.readFileSync(pluginXmlPath, 'utf8');
  if (!content.includes('android:exported="true"')) {
    content = content.replace(
      '<service android:name="com.dmarc.cordovacall.MyConnectionService"',
      '<service android:name="com.dmarc.cordovacall.MyConnectionService" android:exported="true"'
    );
    fs.writeFileSync(pluginXmlPath, content);
    console.log('Patched cordova-plugin-callkit plugin.xml for android:exported');
  } else {
    console.log('cordova-plugin-callkit plugin.xml already patched');
  }
} else {
  console.warn('cordova-plugin-callkit plugin.xml not found');
}

const cordovaCallPath = path.resolve('node_modules/cordova-plugin-callkit/src/android/CordovaCall.java');
if (fs.existsSync(cordovaCallPath)) {
  let content = fs.readFileSync(cordovaCallPath, 'utf8');
  if (content.includes('if(android.os.Build.VERSION.SDK_INT >= 23) {')) {
    // Replace the second `if` with `else if` to prevent registering the phone account twice with different capabilities
    content = content.replace(
      /}\s*if\(android\.os\.Build\.VERSION\.SDK_INT >= 23\) {/g,
      '} else if(android.os.Build.VERSION.SDK_INT >= 23) {'
    );
    fs.writeFileSync(cordovaCallPath, content);
    console.log('Patched cordova-plugin-callkit CordovaCall.java for PhoneAccount capabilities');
  } else {
    console.log('cordova-plugin-callkit CordovaCall.java already patched or does not match');
  }
} else {
  console.warn('cordova-plugin-callkit CordovaCall.java not found');
}

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

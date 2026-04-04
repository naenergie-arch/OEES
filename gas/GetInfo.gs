/* Pomocna funkce pro zjisteni Sheet ID */
function getInfo() {
  const id = PropertiesService.getScriptProperties().getProperty('ADMIN_SHEET_ID');
  Logger.log('ADMIN_SHEET_ID: ' + id);
  if (id) {
    Logger.log('Sheet URL: https://docs.google.com/spreadsheets/d/' + id);
  } else {
    Logger.log('Sheet ID neni nastaven. Spustte nejdrive funkci setup().');
  }
}

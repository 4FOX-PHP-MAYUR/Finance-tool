const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
} = require("../../../startup/commonModules");
const { validateCurrency } = require("../../../validations/admin.validation");
const logger = require("../../../startup/logging");

const Currency = db.currency;

exports.get = async (req, res) => {
  try {
    const isExists = await Currency.findOne().sort({ updatedAt: -1 }).lean();

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(`${msgConf.currency.currencyFetchFailed}`, res.statusCode)
        );
    }

    // Define required currency codes
    const requiredCurrencies = ['AED', 'USD', 'EUR','AUD','INR','EGP','GBP'];

    // Filter rates
    const filteredRates = Object.keys(isExists.rates)
      .filter(key => requiredCurrencies.includes(key))
      .reduce((obj, key) => {
        obj[key] = isExists.rates[key];
        return obj;
      }, {});

      console.log("isExists",isExists.rates['INR']);
      console.log("filteredRates",filteredRates);

    // Optional: Filter oldRates too if needed
    const filteredOldRates = Object.keys(isExists.oldRates)
      .filter(key => requiredCurrencies.includes(key))
      .reduce((obj, key) => {
        obj[key] = isExists.oldRates[key];
        return obj;
      }, {});

    // Replace rates in the data with filtered versions
    const filteredData = {
      ...isExists, // Get plain object from Mongoose doc
      rates: filteredRates,
      oldRates: filteredOldRates,
    };
     return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.currency.currencyFetchSuccess, filteredData),
          res.statusCode
        )
      ); 
  } catch (err) {
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.currency.currencyFetchFailed,
          res.statusCode
        )
      );
  }
};

//Frankfurter API
const updateCurrencyFromFrankfurter = async () => {
  try {
    //const res = await fetch("https://api.frankfurter.dev/v1/latest?base=AUD");

    // TODO change the API key
    const res = await fetch("https://v6.exchangerate-api.com/v6/48f451ad36e6f314ae5f4528/latest/AED");
    
    if (!res.ok) throw new Error("Failed to fetch currency data");

    const data = await res.json();
    console.info("data",data);

    if (!data || !data.conversion_rates || Object.keys(data.conversion_rates).length === 0) {
      throw new Error("Invalid data from Frankfurter API");
    }
    return data;
  } catch (error) {
    throw new Error(`Currency update failed: ${error.message}`);
  }
};

//Update Function
const upsertLatestCurrency = async () => {
  try {
    const result = await updateCurrencyFromFrankfurter();

    const { error, value } = validateCurrency(result);
    if (error) {
      throw error;
    }

    let currency = await Currency.findOne().sort({ createdAt: -1 });

    const userId = "665f20b4a3e79e6b09e847f1";
    // If no record exists → create one
    if (!currency) {
      currency = new Currency({
        base: value?.base_code,
        date: value?.time_last_update_utc,
        rates: value?.conversion_rates,
        oldRates: value?.conversion_rates,
        createdBy: userId,
        updatedBy: userId,
      });

      await currency.save();
      return currency;
    }

    // If record exists → update it
    currency.oldRates = currency.rates; // move existing rates → oldRates
    currency.rates = value.rates || currency.rates;

    // Optional fields
    //if (value.amount !== undefined) currency.amount = value.amount;
    if (value.base_code !== undefined) currency.base = value.base_code;
    if (value.time_last_update_utc !== undefined) currency.date = value.time_last_update_utc;

    currency.updatedBy = userId;
    await currency.save();
    return currency;
  } catch (error) {
    throw error;
  }
};
exports.upsertLatestCurrency = upsertLatestCurrency;

///Update API
exports.update = async (req, res) => {
  console.log("update---");

  try {
    const updatedCurrency = await upsertLatestCurrency();

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.currency.currencyUpdated, updatedCurrency),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`updateConfig ${err.message}`);

    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.currency.currencyUpdateFailed,
          res.statusCode
        )
      );
  }
};

/*
exports.createDefaultCurrency = async () => {
  try {
    const existing = await Currency.findOne();
    if (existing) {
      console.log("Currency record already exists. Skipping creation.");
      return;
    }

    const defaultRates = {
      BGN: 1.1251,
      BRL: 3.6241,
      CAD: 0.89341,
      CHF: 0.53894,
      CNY: 4.6019,
      CZK: 14.3695,
      DKK: 4.2909,
      EUR: 0.57524,
      GBP: 0.48487,
      HKD: 4.9778,
      HUF: 233.62,
      IDR: 10643,
      ILS: 2.2672,
      INR: 54.211,
      ISK: 84.27,
      JPY: 94.6,
      KRW: 906.6,
      MXN: 12.4839,
      MYR: 2.7452,
      NOK: 6.6705,
      NZD: 1.0873,
      PHP: 35.599,
      PLN: 2.4392,
      RON: 2.9349,
      SEK: 6.2612,
      SGD: 0.8345,
      THB: 21.392,
      TRY: 24.77,
      USD: 0.63886,
      ZAR: 11.6987,
    };

    const defaultCurrency = new Currency({
      amount: 1.0,
      base: "AUD",
      date: new Date().toISOString().split("T")[0],
      rates: defaultRates,
      oldRates: defaultRates,
      isActive: true,
      isDeleted: false,
      createdBy: "665f20b4a3e79e6b09e847f1", // Replace with a real User ID
      updatedBy: "665f20b4a3e79e6b09e847f1",
    });

    await defaultCurrency.save();
    console.log("Default currency record created!");
  } catch (err) {
    console.error("Failed to create default record:", err.message);
  }
};
*/

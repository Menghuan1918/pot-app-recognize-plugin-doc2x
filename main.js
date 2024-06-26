async function recognize(base64, lang, options) {
    const { config, utils } = options;
    const { tauriFetch, cacheDir, readBinaryFile, http } = utils;
    let { formula, img_correction, apikey } = config;

    if (apikey === undefined || apikey.length === 0 || apikey === "") {
        throw Error("apikey not found");
    }
    if (formula === undefined || formula.length === 0) {
        formula = "0";
    }
    if (img_correction === undefined || img_correction.length === 0) {
        img_correction = "0";
    }

    let Base_URL = "https://api.doc2x.noedgeai.com/api";

    // Refresh key first
    let key = await tauriFetch(`${Base_URL}/token/refresh`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apikey}`
        },
    });
    let renewkey = "";

    if (key.ok) {
        try {
            renewkey = key.data.data.token;
        }
        catch (error) {
            throw Error(`Get API key error: ${error}: ${JSON.stringify(key)}`)
        }
    } else {
        throw Error(JSON.stringify(key));
    }

    if (renewkey === "" || renewkey === undefined) {
        throw Error("renewkey not found");
    }

    let file_path = `${cacheDir}pot_screenshot_cut.png`;
    let fileContent = await readBinaryFile(file_path);

    // Upload image and get uuid
    let uuid_data = await tauriFetch(`${Base_URL}/platform/async/img`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${renewkey}`,
            'content-type': 'multipart/form-data',
        },
        body: http.Body.form(
            {
                file: {
                    file: fileContent,
                    mime: 'image/png',
                    fileName: 'pot_screenshot_cut.png',
                },
                img_correction: img_correction,
                equation: formula,
            }
        )
    }
    );
    let uuid = "";
    if (uuid_data.ok) {
        try {
            uuid = uuid_data.data.data.uuid;
        }
        catch (error) {
            throw Error(`Error to upload image: ${error}: ${JSON.stringify(uuid_data)}`)
        }
    } else {
        throw Error(JSON.stringify(uuid_data.data));
    }
    if (uuid === "") {
        throw Error("uuid not found");
    }


    // A loop waiting for the result
    while (true) {
        let res = await tauriFetch(`${Base_URL}/platform/async/status?uuid=${uuid}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${renewkey}`
            }
        });

        if (res.ok) {
            const status = res.data.data.status;
            if (status === "success") {
                let text = "";
                text = res.data.data.result.pages[0].md;
                return text;
            } else if (status === "processing" || status === "ready") {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (status === "pages limit exceeded") {
                throw Error(JSON.stringify("pages limit exceeded"));
            } else {
                throw Error(JSON.stringify(res.data));
            }
        } else {
            throw Error(JSON.stringify(res));
        }
    }
}
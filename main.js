async function recognize(base64, lang, options) {
    const { config, utils } = options;
    const { tauriFetch } = utils;
    let { formula, img_correction, apikey } = config;
    base64 = `data:image/png;base64,${base64}`;

    if (apikey === undefined || apikey.length === 0) {
        throw Error("apikey not found");
    }
    if (formula === undefined || formula.length === 0) {
        formula = "0";
    }
    if (img_correction === undefined || img_correction.length === 0) {
        img_correction = "1";
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
            renewkey = key.data.refresh_token;
        }
        catch (error) {
            throw Error(`Error: ${error}: ${JSON.stringify(key)}`)
        }
    } else {
        throw Error(JSON.stringify(key));
    }

    // Upload image and get uuid
    let uuid_data = await tauriFetch(`${Base_URL}/platform/async/img`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${renewkey}`,
        },
        files: {
            "file": base64,
        },
        data: {
            "option": formula,
            "img_correction": img_correction
        },
    }
    );
    let uuid = "";
    if (uuid_data.ok) {
        try {
            uuid = uuid_data.data.uuid;
        }
        catch (error) {
            throw Error(`Error: ${error}: ${JSON.stringify(uuid_data)}`)
        }
    } else {
        throw Error(JSON.stringify(uuid_data));
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
            const { status } = res.data;
            print(status);
            if (status === "success") {
                let text = "";
                for (const data of status["pages"]) {
                    try {
                        text += data["md"];
                    } catch (error) {
                        continue;
                    }
                }
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
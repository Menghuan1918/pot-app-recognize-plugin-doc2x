async function recognize(base64, lang, options) {
    const { config, utils } = options;
    const { tauriFetch } = utils;
    let { apikey, formula, img_correction } = config;
    base64 = `data:image/png;base64,${base64}`;

    if (apikey === undefined || apikey.length === 0) {
        throw "apikey not found";
    }
    if (formula === undefined || formula.length === 0) {
        formula = "0";
    }
    if (img_correction === undefined || img_correction.length === 0) {
        img_correction = "1";
    }

    let Base_URL = "https://api.doc2x.noedgeai.com/api";

    // Refresh key first
    let key = await tauriFetch(`${Base_URL}/refresh`, {
        method: "POST",
        header: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apikey}`
        },
    });

    if (key.ok) {
        key = key.data.token;
    } else {
        throw JSON.stringify(key);
    }

    // Upload image and get uuid
    let uuid = await tauriFetch(`${Base_URL}/platform/async/img`, {
        method: "POST",
        header: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
        },
        body: {
            file: base64,
            data: {
                "option": formula,
                "img_correction": img_correction
            }
        }
    });

    if (uuid.ok) {
        uuid = uuid.data.uuid;
    } else {
        throw JSON.stringify(uuid);
    }
    
    // A loop waiting for the result
    while (true) {
        let res = await tauriFetch(`${Base_URL}/platform/async/status?uuid=${uuid}`, {
            method: "GET",
            header: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            }
        });

        if (res.ok) {
            const { status } = res.data;
            if (status === "success") {
                let text = "";
                for (const data of status.pages) {
                    try {
                        text += data.md;
                    } catch (error) {
                        continue;
                    }
                }
                return text;
            } else if (status === "processing" || status === "ready") {
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (status === "pages limit exceeded") {
                throw JSON.stringify("pages limit exceeded");
            } else {
                throw JSON.stringify(res.data);
            }
        }
    }
}
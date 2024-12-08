import dbClient from './utils/db';

const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 10) {
                    reject()
                }
                else if(!dbClient.isAlive()) {
                    repeatFct()
                }
                else {
                    resolve()
                }
            }, 1000);
        };
        repeatFct();
    })
};

(async () => {
    console.log(dbClient.isAlive());
    await waitConnection().catch((err) => console.log(err));;
    console.log(dbClient.isAlive());
    await dbClient.nbUsers().then((res) => console.log(res)).catch((err) => console.log(err));
    console.log(await dbClient.nbFiles());
})();

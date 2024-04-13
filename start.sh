echo ===
echo Church Presenter by Sunny Yan
echo ===

ARCHIVE="/tmp/church-presenter-update-temp.tar.gz"
VERSION="/tmp/church-presenter-update-temp.json"
if [ -f $ARCHIVE ]; then
    echo Installing update
    tar -zxf $ARCHIVE --strip=1
    rm $ARCHIVE
    mv $VERSION "version.json"
    echo Installation complete!
fi

echo Starting up ... please wait
DEV_MODE=1 npm start
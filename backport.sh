git reset HEAD~1
rm ./backport.sh
git cherry-pick 0537620660dffb92cc57ebec76ef008d1c9a76ca
echo 'Resolve conflicts and force push this branch.\n\nTo backport translations run: bin/i18n/merge-translations <release-branch>'

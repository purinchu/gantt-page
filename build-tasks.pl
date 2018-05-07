#!/usr/bin/env perl

# Simple script to quickly make large textarea inputs for the gantt thingy in
# index.html
# TODO: Port this to JS too.  I'd have written it in JS directly if I were a
# bit better at it :(
#
# Copyright 2018 Michael Pyne <mpyne@purinchu.net>
#
# LICENSE: Hell why not, MIT for this too.

use 5.018;
use strict;
use warnings;

sub printSystemTasks
{
    my ($sysName, $bizProcName) = @_;

    return <<EOF;
-- $sysName/$bizProcName --
$sysName/$bizProcName design APIs ($sysName#) takes 14 days
$sysName/$bizProcName design APIs depends on API guidance
$sysName/$bizProcName API review (API COE#) takes 10 days
$sysName/$bizProcName API review depends on $sysName/$bizProcName design APIs
$sysName/$bizProcName API approval (API COE) takes 8 days
$sysName/$bizProcName API approval depends on $sysName/$bizProcName API review
$sysName/$bizProcName implement API ($sysName#) takes 30 days
$sysName/$bizProcName implement API depends on $sysName/$bizProcName API review

$sysName/$bizProcName design UI ($sysName#) takes 14 days
$sysName/$bizProcName design UI depends on UI guidance
$sysName/$bizProcName UI review (SPOE#) takes 10 days
$sysName/$bizProcName UI review depends on $sysName/$bizProcName design UI
$sysName/$bizProcName UI approval (SPOE) takes 5 days
$sysName/$bizProcName UI approval depends on $sysName/$bizProcName UI review
$sysName/$bizProcName implement UI ($sysName#) takes 30 days
$sysName/$bizProcName implement UI depends on $sysName/$bizProcName UI review

$sysName/$bizProcName request data usage ($sysName#) takes 3 days
$sysName/$bizProcName request data usage depends on $sysName/$bizProcName design APIs
$sysName/$bizProcName review data use request (EIM#) takes 10 days
$sysName/$bizProcName review data use request depends on $sysName/$bizProcName request data usage
$sysName/$bizProcName approve data usage (EIM) takes 5 days
$sysName/$bizProcName approve data usage depends on $sysName/$bizProcName review data use request

$sysName/$bizProcName cybersecurity review (Acq IA#) takes 150 days
$sysName/$bizProcName cybersecurity review depends on $sysName/$bizProcName implement API
$sysName/$bizProcName cybersecurity review depends on $sysName/$bizProcName implement UI
$sysName/$bizProcName cybersecurity approval (Acq IA) takes 30 days
$sysName/$bizProcName cybersecurity approval depends on $sysName/$bizProcName cybersecurity review

$sysName/$bizProcName deploy to production ($sysName) takes 5 days
$sysName/$bizProcName deploy to production depends on $sysName/$bizProcName cybersecurity approval
$sysName/$bizProcName deploy to production depends on $sysName/$bizProcName approve data usage
$sysName/$bizProcName deploy to production depends on $sysName/$bizProcName implement API
$sysName/$bizProcName deploy to production depends on $sysName/$bizProcName implement UI

EOF
}

# Replaces ($sysName#) types of constructs with a specific number in the given
# input, e.g.  $sysName1 or $sysName2, incrementing the number for each
# successive line using the same exact $sysName# declaration.  Starts over once
# the max number of minions is reached for that $sysName#
# Returns the substituted text
# TODO: Make minion count configurable
sub assignMinions
{
    my $text = shift;
    my @lines = split("\n", $text);
    my %performerCounts;
    my %maxMinions;

    foreach my $line (@lines) {
        my ($subPerformer) = ($line =~ /\(([^)]+)#\)/);
        next unless $subPerformer;

        $maxMinions{$subPerformer} //= 4; # TODO: Here's where to make configurable
        my $maxCount = $maxMinions{$subPerformer};
        my $id = (($performerCounts{$subPerformer} // 0) + 1) % $maxCount;
        $performerCounts{$subPerformer} = $id;

        # We increment $id again just to make human-readable
        $id++;

        $subPerformer = "($subPerformer.$id)";

        # Make the replacement
        $line =~ s/(\([^)]+#\))/$subPerformer/;
    }

    return join("\n", @lines);
}

# Main script

my $text;

for my $i (1 .. 5) {
    for my $j (1 .. 2) {
        $text .= printSystemTasks("sys$i", "BizP$j");
    }
}

$text = assignMinions($text);

say <<EOF;
# Use this "#" character to start a comment that the program ignores

# Opens up a new group of tasks
-- General --

# Tasks follow: "name" ("performer") from "start date" to "end date"
# or, "name" ("performer") takes "days" days
#    but this only works if you add dependencies (see below)

API guidance (API COE) from 2018-05-10 to 2018-05-20
UI guidance (SPOE) from 2018-05-10 to 2018-05-20

# Add dependencies with: "later task" depends on "earlier task"

# An automated set of tasks follows from here.  One day this will
# itself be possible to express here and this page would auto-
# generate it for you.  But for now here's an example:

$text
EOF

exit 0;
